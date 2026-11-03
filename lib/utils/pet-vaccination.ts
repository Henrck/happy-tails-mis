/** Customer-reported vaccination status; not a verified medical record. */
export type VaccinationStatus = "vaccinated" | "not_vaccinated" | "not_sure";
export const vaccinationLabel = (value?: VaccinationStatus | null): string =>
  value === "vaccinated" ? "Vaccinated" : value === "not_vaccinated" ? "Not Vaccinated" : "Not Sure";
