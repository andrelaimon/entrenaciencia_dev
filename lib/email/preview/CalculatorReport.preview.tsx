import CalculatorReportEmail from '../templates/CalculatorReport.email';

// Mock data so `npx react-email dev` can render the template.
// Run from repo root:  npx react-email dev --dir lib/email/preview
export default function Preview() {
  return (
    <CalculatorReportEmail
      name="Andrea"
      inputs={{
        sex:        'female',
        age:        35,
        weight:     70,
        height:     165,
        activity:   1.55,
        goal:       'loss',
        macroSplit: 'balanced',
        units:      'metric',
      }}
      result={{
        calories:   1613,
        protein:    112,
        carbs:      180,
        fat:        49,
        bmr:        1395,
        tdee:       2163,
        proteinPct: 0.278,
        carbsPct:   0.447,
        fatPct:     0.275,
        warnings:   [],
      }}
    />
  );
}
