import { ApiError } from "./api";

/** Messages adaptés à l'utilisateur : on ne montre jamais un code technique brut. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "INSUFFICIENT_SEATS")
      return "Il ne reste plus assez de places pour cette demande.";
    if (error.code === "RATE_LIMITED")
      return "Trop de demandes. Patientez un instant avant de réessayer.";
    if (error.code === "VALIDATION_ERROR")
      return "Certaines informations sont invalides. Vérifiez le formulaire.";
    return error.message;
  }
  return "Une erreur inattendue est survenue.";
}
