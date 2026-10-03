import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.includes('pi-tui')) return { url: 'stub:tui', shortCircuit: true };
    if (specifier.endsWith('/vcs-jj-footer.ts') || specifier === './vcs-jj-footer.ts') return { url: 'stub:jj', shortCircuit: true };
    if (specifier.includes('pi-go-bars/core.ts')) return { url: 'stub:go', shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    const sources = {
      'stub:tui': `export class Container { children=[]; addChild(c){this.children.push(c)} } export class Text { constructor(text){this.text=text} } export const visibleWidth=s=>s.replace(/\\x1b\\[[0-9;]*m/g,'').length; export const truncateToWidth=(s,w)=>s.slice(0,w);`,
      'stub:jj': 'export const resolveJjBookmark=()=>null;',
      'stub:go': 'export const fetchWithCache=()=>{throw Error("unexpected Go fetch")}; export const formatDuration=String;',
    };
    if (url in sources) return { format: 'module', source: sources[url], shortCircuit: true };
    return next(url, context);
  },
});
const { default: native } = await import('../pi-agent/extensions/pi-codex-bars.ts');
const { default: proxy } = await import('../pi-agent/extensions/litellm-backend-status.ts');
const theme = { fg: (_c,s)=>s, bold:s=>s, getFgAnsi:()=>'' };
function harness(extension, provider) {
  const handlers = new Map(); const commands = new Map(); let footer; let overlay;
  const ctx = {
    model: { provider, id:'test' }, hasUI:true,
    ui: { setFooter: f=>{footer=f?.({ requestRender(){} }, theme, {
      onBranchChange:()=>()=>{}, getGitBranch:()=>null, getAvailableProviderCount:()=>1, getExtensionStatuses:()=>new Map(),
    })}, setWidget(){}, setStatus(){}, custom:async f=>{overlay=f({},theme,{},()=>{})} },
    sessionManager: {getCwd:()=>'/test',getSessionName:()=>null,getEntries:()=>[]},
    getContextUsage:()=>({contextWindow:1000,percent:0}),modelRegistry:{isUsingOAuth:()=>false},
  };
  extension({on:(name,fn)=>handlers.set(name,fn),registerCommand:(name,c)=>commands.set(name,c),getThinkingLevel:()=> 'off'});
  return { ctx, event:async(name,e={})=>handlers.get(name)?.(e,ctx), render:()=>footer?.render(160).join('\n')??'', command:async()=>{await commands.get('codex').handler('',ctx);return overlay.children.map(c=>c.text).join('\n')} };
}
const headers = { 'llm_provider-x-codex-primary-used-percent':'37', 'llm_provider-x-codex-primary-window-minutes':'120' };
test('native headers, snapshot command, missing headers and model reset', async()=>{
  const h=harness(native,'openai-codex'); await h.event('session_start');
  assert.match(await h.command(), /No quota headers yet/);
  await h.event('after_provider_response',{status:200,headers});
  assert.match(h.render(), /2h .*37%/);
  assert.match(await h.command(), /Last response: \d{4}-/);
  await h.event('after_provider_response',{status:200,headers:{}});
  assert.doesNotMatch(h.render(), /37%/);
  h.ctx.model.provider='litellm'; await h.event('model_select',{model:h.ctx.model});
  await h.event('after_provider_response',{status:200,headers});
  assert.match(await h.command(), /37%/);
  await h.event('session_shutdown');
});
test('LiteLLM detects quota without metadata and clears on response/model switch', async()=>{
  const h=harness(proxy,'litellm'); await h.event('session_start'); await new Promise(r=>setTimeout(r,5));
  await h.event('after_provider_response',{status:200,headers});
  assert.match(h.render(), /2h .*37%/);
  await h.event('after_provider_response',{status:200,headers:{'x-litellm-model-name':'other/model'}});
  assert.doesNotMatch(h.render(), /37%/);
  await h.event('after_provider_response',{status:200,headers});
  await h.event('model_select',{model:h.ctx.model}); await new Promise(r=>setTimeout(r,5));
  assert.doesNotMatch(h.render(), /37%/);
  await h.event('session_shutdown');
});

test('native websocket quota events update only overall native usage', async()=>{
  const h=harness(native,'openai-codex'); await h.event('session_start');
  const event={provider:'openai-codex',api:'openai-codex-responses',model:'test',data:{type:'codex.rate_limits',rate_limits:{primary:{used_percent:42,window_minutes:300}}}};
  await h.event('provider_stream_event',event);
  assert.match(h.render(), /42%/);
  await h.event('provider_stream_event',{...event,data:{...event.data,metered_limit_name:'codex_other',rate_limits:{primary:{used_percent:99}}}});
  assert.match(h.render(), /42%/);
  await h.event('provider_stream_event',{...event,provider:'other'});
  assert.match(h.render(), /42%/);
  await h.event('provider_stream_event',{...event,data:{type:'response.completed'}});
  assert.match(h.render(), /42%/);
  await h.event('model_select',{model:{provider:'litellm'}}); h.ctx.model.provider='litellm';
  await h.event('provider_stream_event',event);
  assert.match(await h.command(), /No quota headers yet/);
  await h.event('session_shutdown');
});

test('proxy detail and footer discard failed-response quota; missing detail explains forwarding', async()=>{
  const detail=harness(native,'litellm');
  const footer=harness(proxy,'litellm');
  await detail.event('session_start');
  await footer.event('session_start');
  await new Promise(r=>setTimeout(r,5));
  for (const h of [detail,footer]) await h.event('after_provider_response',{status:200,headers});
  assert.match(await detail.command(), /37%/);
  assert.match(footer.render(), /37%/);
  for (const h of [detail,footer]) await h.event('after_provider_response',{status:500,headers});
  const snapshot=await detail.command();
  assert.doesNotMatch(snapshot, /37%/);
  assert.match(snapshot, /No quota headers yet/);
  assert.match(snapshot, /LiteLLM must forward provider quota headers/);
  assert.doesNotMatch(footer.render(), /37%/);
  for (const h of [detail,footer]) await h.event('session_shutdown');
});
