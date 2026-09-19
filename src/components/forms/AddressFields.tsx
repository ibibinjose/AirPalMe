import { HOST_COUNTRIES, addressLayoutFor, addressOk, type AddressParts } from "@shared/geo-address";
import { ValidField, fieldInput } from "./ValidField";

export function AddressFields({ value, onChange }: { value: AddressParts; onChange: (next: AddressParts) => void }) {
  const layout = addressLayoutFor(value.countryCode);
  const patch = (part: Partial<AddressParts>) => onChange({ ...value, ...part });
  return (
    <div className="space-y-3">
      <ValidField label="Country" ok={Boolean(value.countryCode)}>
        <select
          value={value.countryCode}
          onChange={(e) => patch({ countryCode: e.target.value })}
          className={fieldInput}
        >
          {HOST_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </ValidField>
      <ValidField label="Street" ok={Boolean(value.line1.trim())} error={value.line1 === "" ? null : undefined}>
        <input
          value={value.line1}
          onChange={(e) => patch({ line1: e.target.value })}
          placeholder={layout.streetPlaceholder}
          autoComplete="address-line1"
          className={fieldInput}
        />
      </ValidField>
      <ValidField label="Line 2 (optional)">
        <input
          value={value.line2}
          onChange={(e) => patch({ line2: e.target.value })}
          placeholder="Unit, floor, building"
          autoComplete="address-line2"
          className={fieldInput}
        />
      </ValidField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ValidField label={layout.cityLabel} ok={Boolean(value.city.trim())}>
          <input
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            placeholder={layout.cityPlaceholder}
            autoComplete="address-level2"
            className={fieldInput}
          />
        </ValidField>
        <ValidField label={layout.stateLabel} ok={Boolean(value.region.trim())}>
          <input
            value={value.region}
            onChange={(e) => patch({ region: e.target.value })}
            placeholder={layout.statePlaceholder}
            autoComplete="address-level1"
            className={fieldInput}
          />
        </ValidField>
        <ValidField label={layout.postalLabel} ok={Boolean(value.postal.trim())}>
          <input
            value={value.postal}
            onChange={(e) => patch({ postal: e.target.value })}
            placeholder={layout.postalPlaceholder}
            autoComplete="postal-code"
            className={fieldInput}
          />
        </ValidField>
      </div>
      {addressOk(value) ? null : <p className="text-[12px] text-mute">Street, city, and country.</p>}
    </div>
  );
}
