import { useEffect, useState } from "react";
import {
  HOST_COUNTRIES,
  composePhone,
  countryByCode,
  countryFlag,
  countryFromPhone,
  isValidPhone,
  nationalDigits,
  splitPhone,
} from "@shared/geo-address";
import { ValidField, fieldInput } from "./ValidField";
import { cn } from "@/lib/cn";

export function PhoneField({
  value,
  onChange,
  required,
  label = "Mobile Number",
}: {
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  label?: string;
}) {
  const initialCountry = countryFromPhone(value)?.code || "AU";
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry);
  const [national, setNational] = useState<string>(() => splitPhone(value).national);

  // Synchronize when external value changes
  useEffect(() => {
    if (!value) {
      if (national !== "0" && national !== "") {
        setNational("");
      }
      return;
    }
    const detected = countryFromPhone(value);
    if (detected) {
      setSelectedCountry(detected.code);
    }
    const parsed = splitPhone(value);
    const userDigits = nationalDigits(national).replace(/^0+/, "");
    const valueDigits = nationalDigits(parsed.national);
    if (userDigits !== valueDigits) {
      setNational(parsed.national);
    }
  }, [value]);

  const activeCountry = countryByCode(selectedCountry) || HOST_COUNTRIES[0];
  const ok = isValidPhone(value);

  function handleCountryChange(newCode: string) {
    setSelectedCountry(newCode);
    const country = countryByCode(newCode) || HOST_COUNTRIES[0];
    if (national.trim()) {
      onChange(composePhone(country.dial, national));
    }
  }

  function handleNumberChange(raw: string) {
    // If user pastes an international number starting with + or 00
    if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) {
      const detected = countryFromPhone(raw);
      if (detected) {
        setSelectedCountry(detected.code);
        const parsed = splitPhone(raw);
        setNational(parsed.national);
        onChange(composePhone(detected.dial, parsed.national));
        return;
      }
    }

    setNational(raw);
    onChange(composePhone(activeCountry.dial, raw));
  }

  const placeholder =
    selectedCountry === "AU"
      ? "412 345 678"
      : selectedCountry === "IN"
        ? "98765 43210"
        : selectedCountry === "US" || selectedCountry === "CA"
          ? "555 123 4567"
          : selectedCountry === "GB"
            ? "7911 123456"
            : selectedCountry === "NZ"
              ? "21 123 4567"
              : selectedCountry === "SG"
                ? "9123 4567"
                : "Mobile number";

  return (
    <ValidField
      label={label}
      ok={ok}
      error={value && !ok ? "Enter a valid mobile number (8–15 digits)" : null}
      hint={!value && required ? "Choose country and enter local number" : undefined}
    >
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <select
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="h-12 w-32 md:w-36 rounded-2xl bg-card pl-3 pr-7 text-xs font-semibold border border-line outline-none focus:ring-2 focus:ring-brand/40 appearance-none cursor-pointer focus:border-brand"
            aria-label="Country Code"
          >
            {HOST_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {countryFlag(c.code)} {c.code} ({c.dial}) · {c.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mute text-[9px]">▼</div>
        </div>
        <input
          value={national}
          onChange={(e) => handleNumberChange(e.target.value)}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          className={cn(fieldInput, "flex-1")}
          aria-label="Mobile Number"
        />
      </div>
    </ValidField>
  );
}
