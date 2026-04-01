/**
 * Environmental Forecast Mode
 *
 * Displayed when the user's global severity is 0 (no symptoms).
 * Instead of showing ranked allergens, this mode shows current
 * environmental conditions: pollen levels, AQI, and weather.
 *
 * All data is informational only — no causal claims.
 * FDA disclaimer is required on this surface.
 */

import { FdaDisclaimer } from "@/components/shared/fda-disclaimer";
import type { PollenResult } from "@/lib/apis/pollen";
import type { WeatherResult } from "@/lib/apis/weather";
import type { AqiResult } from "@/lib/apis/aqi";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ForecastData {
  pollen: PollenResult;
  weather: WeatherResult;
  aqi: AqiResult;
  region: string | null;
}

export interface EnvironmentalForecastProps {
  /** Environmental data from /api/forecast. Null when loading or unavailable. */
  data?: ForecastData | null;
  /** Whether data is currently loading */
  loading?: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Map UPI (0-5) to a human-readable label */
function upiLabel(value: number | null): string {
  if (value === null) return "Unavailable";
  if (value === 0) return "None";
  if (value === 1) return "Very Low";
  if (value === 2) return "Low";
  if (value === 3) return "Moderate";
  if (value === 4) return "High";
  return "Very High";
}

/** Map UPI (0-5) to a color */
function upiColor(value: number | null): string {
  if (value === null) return "#0682BB";
  if (value <= 1) return "#00B6E2";
  if (value <= 2) return "#0898C8";
  if (value <= 3) return "#0682BB";
  if (value <= 4) return "#056DA5";
  return "#055A8C";
}

/** Map AQI to a human-readable label */
function aqiLabel(value: number | null): string {
  if (value === null) return "Unavailable";
  if (value <= 50) return "Good";
  if (value <= 100) return "Moderate";
  if (value <= 150) return "Unhealthy for Sensitive Groups";
  if (value <= 200) return "Unhealthy";
  if (value <= 300) return "Very Unhealthy";
  return "Hazardous";
}

/** Map AQI to a color */
function aqiColor(value: number | null): string {
  if (value === null) return "#0682BB";
  if (value <= 50) return "#00B6E2";
  if (value <= 100) return "#0682BB";
  if (value <= 150) return "#056DA5";
  if (value <= 200) return "#055A8C";
  return "#044A72";
}

/** Wind direction degrees to compass label */
function windDirection(deg: number | null): string {
  if (deg === null) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function DataCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-brand-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-brand-text">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DataRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-brand-text-secondary">
        {label}
      </span>
      <span
        className="text-sm font-medium"
        style={{ color: color ?? "#045A82" }}
      >
        {value}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div
      data-testid="forecast-loading"
      className="space-y-4"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg bg-brand-surface-muted"
        />
      ))}
    </div>
  );
}

function NoDataMessage() {
  return (
    <div
      data-testid="forecast-no-data"
      className="rounded-lg border border-brand-border bg-brand-surface-muted p-6 text-center"
    >
      <p className="text-sm text-brand-text-secondary">
        Environmental data is not available. Please ensure your home location is
        set in your profile to receive local forecasts.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function EnvironmentalForecast({
  data,
  loading = false,
}: EnvironmentalForecastProps) {
  const hasAnyData =
    data &&
    (data.pollen.upi_tree !== null ||
      data.pollen.upi_grass !== null ||
      data.pollen.upi_weed !== null ||
      data.aqi.aqi !== null ||
      data.weather.temp_f !== null);

  return (
    <div
      data-testid="environmental-forecast"
      className="space-y-4"
    >
      {/* Good news banner */}
      <div className="rounded-xl border border-brand-border bg-brand-primary-light p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </span>
          <div>
            <h2 className="text-base font-bold text-brand-primary-dark">
              No Symptoms Today
            </h2>
            <p className="mt-1 text-sm text-brand-text-secondary">
              Great news! Here is what is currently in the air around you.
            </p>
          </div>
        </div>
      </div>

      {/* FDA Disclaimer */}
      <FdaDisclaimer variant="compact" />

      {/* Loading state */}
      {loading && <LoadingSkeleton />}

      {/* No data state */}
      {!loading && !hasAnyData && <NoDataMessage />}

      {/* Environmental data cards */}
      {!loading && hasAnyData && data && (
        <>
          {/* Pollen Card */}
          <DataCard title="Pollen Levels">
            <DataRow
              label="Tree Pollen"
              value={upiLabel(data.pollen.upi_tree)}
              color={upiColor(data.pollen.upi_tree)}
            />
            <DataRow
              label="Grass Pollen"
              value={upiLabel(data.pollen.upi_grass)}
              color={upiColor(data.pollen.upi_grass)}
            />
            <DataRow
              label="Weed Pollen"
              value={upiLabel(data.pollen.upi_weed)}
              color={upiColor(data.pollen.upi_weed)}
            />
            {data.pollen.species.length > 0 && (
              <div className="mt-2 border-t border-brand-border-light pt-2">
                <p className="mb-1 text-xs font-medium text-brand-text-muted">
                  Active Species
                </p>
                {data.pollen.species
                  .filter((s) => s.index.value > 0)
                  .slice(0, 5)
                  .map((species) => (
                    <DataRow
                      key={species.display_name}
                      label={species.display_name}
                      value={species.index.category}
                      color={upiColor(species.index.value)}
                    />
                  ))}
              </div>
            )}
          </DataCard>

          {/* AQI Card */}
          <DataCard title="Air Quality">
            {data.aqi.aqi !== null ? (
              <>
                <div className="mb-2 flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: aqiColor(data.aqi.aqi) }}
                  >
                    {data.aqi.aqi}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: aqiColor(data.aqi.aqi) }}
                  >
                    {aqiLabel(data.aqi.aqi)}
                  </span>
                </div>
                {data.aqi.pm25 !== null && (
                  <DataRow
                    label="PM2.5"
                    value={`${data.aqi.pm25} ug/m3`}
                  />
                )}
                {data.aqi.pm10 !== null && (
                  <DataRow
                    label="PM10"
                    value={`${data.aqi.pm10} ug/m3`}
                  />
                )}
                {data.aqi.dominant_pollutant && (
                  <DataRow
                    label="Dominant Pollutant"
                    value={data.aqi.dominant_pollutant.toUpperCase()}
                  />
                )}
                {data.aqi.station && (
                  <p className="mt-2 text-xs text-brand-text-faint">
                    Station: {data.aqi.station}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-brand-text-muted">
                AQI data unavailable for your location.
              </p>
            )}
          </DataCard>

          {/* Weather Card */}
          <DataCard title="Weather Conditions">
            {data.weather.temp_f !== null ? (
              <>
                <DataRow
                  label="Temperature"
                  value={`${data.weather.temp_f}\u00B0F`}
                />
                {data.weather.humidity_pct !== null && (
                  <DataRow
                    label="Humidity"
                    value={`${data.weather.humidity_pct}%`}
                  />
                )}
                {data.weather.wind_mph !== null && (
                  <DataRow
                    label="Wind"
                    value={`${data.weather.wind_mph} mph ${windDirection(data.weather.wind_direction_deg)}`}
                  />
                )}
                {data.weather.rain_last_12h && (
                  <DataRow label="Precipitation" value="Rain detected" />
                )}
                {data.weather.thunderstorm_6h && (
                  <DataRow label="Storm Activity" value="Thunderstorm nearby" />
                )}
              </>
            ) : (
              <p className="text-sm text-brand-text-muted">
                Weather data unavailable for your location.
              </p>
            )}
          </DataCard>

          {/* Region info */}
          {data.region && (
            <p
              className="text-center text-xs text-brand-text-faint"
              data-testid="forecast-region"
            >
              Region: {data.region}
            </p>
          )}
        </>
      )}
    </div>
  );
}
