import CalculatorReportEmail from '../templates/CalculatorReport.email';

// Mock data so `npx react-email dev` can render the template.
// Run from repo root:  npx react-email dev --dir lib/email/preview
export default function Preview() {
  return (
    <CalculatorReportEmail
      name="Andrea"
      inputs={{
        sex:          'female',
        age:          35,
        weight:       70,
        height:       165,
        activity:     1.55,
        goal:         'loss',
        macroSplit:   'balanced',
        proteinLevel: 'high',
        units:        'metric',
      }}
      result={{
        calories:   1624,
        protein:    154,
        carbs:      140,
        fat:        50,
        proteinMin: 140,
        proteinMax: 162,
        carbsMin:   122,
        carbsMax:   164,
        fatMin:     45,
        fatMax:     54,
        bmr:        1395,
        tdee:       2163,
        proteinPct: 0.379,
        carbsPct:   0.345,
        fatPct:     0.277,
        warnings:   [],
      }}
    />
  );
}
