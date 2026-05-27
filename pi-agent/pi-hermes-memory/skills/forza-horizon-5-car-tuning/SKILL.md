---
name: "forza-horizon-5-car-tuning"
description: "Tune Forza Horizon 5 cars using baseline setup, telemetry, one-change-at-a-time testing, and symptom-based fixes."
version: 1
created: "2026-05-22"
updated: "2026-05-22"
---
## When to Use
Use when user asks for Forza Horizon 5 car tuning help: baseline tunes, grip/handling troubleshooting, class-specific tire choices, transmission setup, aero, differential, suspension, or telemetry interpretation. Based on video https://www.youtube.com/watch?v=DperqPCkfh0 plus practical FH5 tuning rules. Not for real-world car setup.

## Procedure
1. Ask for car, class/PI target, drivetrain, tires, power/weight, race type (road/street/cross-country/rally/drag), assists, controller/wheel, and main symptom if missing.
2. Start baseline: tire pressure around 29 psi for A-class; heavier cars slightly higher, lighter lower. Typical range 27–34 psi, outliers 25–38 psi. Stock/street/rally tires usually lower, slicks higher.
3. Alignment baseline: remove 0.2–0.3° camber for circuit, 0.5–0.8° for street racing versus aggressive defaults. Caster 5–7°. Toe 0 initially except tiny front toe-out for heavy handling builds or later correction.
4. Anti-roll bars: install race ARBs. Start near 20 front / 55 rear. FWD uses more rear rotation; AWD often softer front and more rear. Prefer ARBs high enough to preserve alignment and stability.
5. Springs/ride height: rear spring usually higher than front unless car extremely front-heavy. Slower handling cars tolerate higher rates; very fast cars often need softer rates. Lower ride height for high speed; raise slightly for handling/bumps. Front height usually <= rear height.
6. Damping baseline: bump lower than rebound; bump should be 40–70% of rebound. Lower bump for grip/compliance, raise rebound slightly for stability. Front-heavy cars may need rear bump lowered more while keeping rebound balanced.
7. Brakes: FH5 brake balance slider behaves reversed. For front-engine cars try 53%; mid/rear engine try 54%. Leave pressure default unless driver preference demands change. More rear bias helps rotation but can destabilize braking.
8. Differential: install race diff unless factory active AWD system may be better (GT-R, Evo, WRX/STI, Audi, xDrive BMW). RWD: mild/stock accel, decel near 0. FWD: front accel 5–25%, decel 0. AWD: front like FWD, rear like RWD, center 70–90% rear bias.
9. Test in Rivals or consistent event with ideal/repeatable conditions on target track type. Change exactly one parameter at a time. Record setting, lap time, sector feel, and symptom.
10. Use telemetry. Tire heat 3-section view guides camber: outside hotter means more negative camber; inside hotter means less. Target even temps with outside slightly cooler. Suspension telemetry/visual motion guides spring, damping, ride height: use most travel without bottoming; no bouncing or launch over bumps.
11. Transmission if needed: set 1st/final drive for slight controllable launch wheelspin. Set top gear 10–20 mph above max track speed, or shorten until theoretical top speed drops sharply for drag-limited builds. Space gears logarithmically: bigger gaps early, tighter gaps later. 8+ speeds often only need final drive or no change.
12. Aero: more downforce adds drag; front downforce costs less speed than rear. Use rear aero for stability, reduce rear aero if car understeers. S2/downforce cars may need lower ride height, softer springs, and heavier damping.
13. Tire selection: D/C mostly stock tires; B mostly stock, street for tight circuits; A street minimum, semi-slick common; S1/S2 can use rally tires to lower PI or handle wet/unpaved. Heavier/older cars need more tire.
14. For each recommendation, explain tradeoff, suggest small increment, then request feedback after 2–3 clean laps.

## Pitfalls
- Do not apply real-world tire pressure/heat assumptions blindly; FH5 pressure model does not map cleanly to real contact patch physics.
- Do not change springs, damping, and ARBs together; impossible to know cause/effect.
- Do not max caster to 7° by default; too much caster can make mid-corner behavior unpredictable.
- Do not use toe early except tiny changes; toe is final trim, usually 0.1–0.2° increments.
- Do not use rear ARB softening as first fix for RWD exit oversteer; check diff, rear tire pressure, rear toe-in, rear ride height, and throttle control.
- Do not make bump equal to or greater than rebound; causes bounce/instability.
- Do not forget FH5 brake balance slider reversal.
- Do not replace stock suspension on Track Toys or four-wheel-steering cars without considering loss of factory 4WS behavior.
- Do not over-upgrade transmission; upgrade only for bad gear gaps, unusable overdrive, or insufficient top speed.

## Verification
1. User can state baseline tune values for requested car/class/drivetrain.
2. After each test change, lap time or consistent handling symptom improves without introducing worse instability.
3. Telemetry shows tire temps more even across inner/middle/outer sections during hard cornering.
4. Suspension uses travel without bottoming, persistent bouncing, or leaving ground on mild bumps.
5. Transmission reaches target speed without bouncing limiter and without long dead gears.
6. Final answer includes one-change-at-a-time next test step, not large bundle of simultaneous changes.