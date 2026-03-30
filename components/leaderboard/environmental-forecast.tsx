/**
 * Environmental Forecast Mode
 *
 * Displayed when the user's global severity is 0 (no symptoms).
 * Instead of showing ranked allergens, this mode shows a positive
 * message indicating the user is symptom-free.
 */

export function EnvironmentalForecast() {
  return (
    <div
      data-testid="environmental-forecast"
      className="rounded-xl border border-green-200 bg-green-50 p-6 text-center"
      style={{
        borderRadius: "0.75rem",
        border: "1px solid #bbf7d0",
        backgroundColor: "#f0fdf4",
        padding: "1.5rem",
        textAlign: "center",
      }}
    >
      <span
        className="mb-3 block text-4xl"
        style={{
          display: "block",
          fontSize: "2.25rem",
          marginBottom: "0.75rem",
        }}
        aria-hidden="true"
      >
        &#x2600;
      </span>
      <h2
        className="mb-2 text-lg font-bold text-green-800"
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "#166534",
          marginBottom: "0.5rem",
        }}
      >
        Environmental Forecast Mode
      </h2>
      <p
        className="text-sm text-green-700"
        style={{
          fontSize: "0.875rem",
          color: "#15803d",
          margin: 0,
        }}
      >
        No symptoms reported. Your allergen rankings will appear here once you
        log symptom data through daily check-ins.
      </p>
    </div>
  );
}
