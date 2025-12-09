import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Testy dla schematów walidacji używanych w formularzach autoryzacji
 * Schematy skopiowane z komponentów formularzy dla celów testowych
 */

// LoginSchema
const loginSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Podaj poprawny adres e-mail."),
  password: z.string({ required_error: "Hasło jest wymagane." }).min(1, "Hasło jest wymagane."),
  rememberMe: z.boolean().default(false),
});

// RegisterSchema
const registerSchema = z
  .object({
    email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Podaj poprawny adres e-mail."),
    password: z
      .string({ required_error: "Hasło jest wymagane." })
      .min(8, "Hasło powinno zawierać co najmniej 8 znaków.")
      .regex(/[A-ZĄĆĘŁŃÓŚŹŻ]/, "Dodaj przynajmniej jedną wielką literę.")
      .regex(/[a-ząćęłńóśźż]/, "Dodaj przynajmniej jedną małą literę.")
      .regex(/\d/, "Dodaj przynajmniej jedną cyfrę."),
    confirmPassword: z.string({ required_error: "Potwierdź hasło." }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });

// ResetPasswordSchema
const resetSchema = z.object({
  email: z.string({ required_error: "Adres e-mail jest wymagany." }).email("Podaj poprawny adres e-mail."),
});

// UpdatePasswordSchema
const updatePasswordSchema = z
  .object({
    password: z
      .string({ required_error: "Hasło jest wymagane." })
      .min(8, "Hasło powinno zawierać co najmniej 8 znaków.")
      .regex(/[A-ZĄĆĘŁŃÓŚŹŻ]/, "Dodaj przynajmniej jedną wielką literę.")
      .regex(/[a-ząćęłńóśźż]/, "Dodaj przynajmniej jedną małą literę.")
      .regex(/\d/, "Dodaj przynajmniej jedną cyfrę."),
    confirmPassword: z.string({ required_error: "Potwierdź hasło." }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });

describe("LoginSchema", () => {
  describe("Poprawne dane", () => {
    it("akceptuje poprawny email i hasło", () => {
      const validData = {
        email: "jan.kowalski@example.com",
        password: "password123",
        rememberMe: false,
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("akceptuje rememberMe jako true", () => {
      const validData = {
        email: "test@example.com",
        password: "pass",
        rememberMe: true,
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("ustawia domyślną wartość rememberMe jako false", () => {
      const dataWithoutRememberMe = {
        email: "test@example.com",
        password: "password",
      };

      const result = loginSchema.parse(dataWithoutRememberMe);
      expect(result.rememberMe).toBe(false);
    });
  });

  describe("Walidacja email", () => {
    it("odrzuca nieprawidłowy format email", () => {
      const invalidData = {
        email: "nieprawidlowy-email",
        password: "password123",
        rememberMe: false,
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Podaj poprawny adres e-mail.");
      }
    });

    it("odrzuca pusty email", () => {
      const invalidData = {
        email: "",
        password: "password123",
        rememberMe: false,
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Walidacja hasła", () => {
    it("odrzuca puste hasło", () => {
      const invalidData = {
        email: "test@example.com",
        password: "",
        rememberMe: false,
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło jest wymagane.");
      }
    });
  });
});

describe("RegisterSchema", () => {
  describe("Poprawne dane", () => {
    it("akceptuje poprawne dane rejestracji", () => {
      const validData = {
        email: "nowy.uzytkownik@example.com",
        password: "Hasło123",
        confirmPassword: "Hasło123",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("akceptuje hasło z polskimi znakami", () => {
      const validData = {
        email: "test@example.com",
        password: "Ążćęłńó1",
        confirmPassword: "Ążćęłńó1",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Walidacja długości hasła", () => {
    it("odrzuca hasło krótsze niż 8 znaków", () => {
      const invalidData = {
        email: "test@example.com",
        password: "Abc123",
        confirmPassword: "Abc123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło powinno zawierać co najmniej 8 znaków.");
      }
    });

    it("akceptuje hasło dokładnie 8 znaków", () => {
      const validData = {
        email: "test@example.com",
        password: "Abcdef12",
        confirmPassword: "Abcdef12",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("akceptuje długie hasło", () => {
      const validData = {
        email: "test@example.com",
        password: "DługieHasło123456789",
        confirmPassword: "DługieHasło123456789",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Walidacja wielkiej litery", () => {
    it("odrzuca hasło bez wielkiej litery", () => {
      const invalidData = {
        email: "test@example.com",
        password: "hasło1234",
        confirmPassword: "hasło1234",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const upperCaseError = result.error.issues.find((issue) =>
          issue.message.includes("wielką literę")
        );
        expect(upperCaseError).toBeDefined();
      }
    });

    it("akceptuje polską wielką literę (Ą, Ć, Ę, Ł, Ń, Ó, Ś, Ź, Ż)", () => {
      const polishUppercaseLetters = ["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"];

      polishUppercaseLetters.forEach((letter) => {
        const validData = {
          email: "test@example.com",
          password: `${letter}bcdefg1`,
          confirmPassword: `${letter}bcdefg1`,
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Walidacja małej litery", () => {
    it("odrzuca hasło bez małej litery", () => {
      const invalidData = {
        email: "test@example.com",
        password: "HASŁO1234",
        confirmPassword: "HASŁO1234",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const lowerCaseError = result.error.issues.find((issue) =>
          issue.message.includes("małą literę")
        );
        expect(lowerCaseError).toBeDefined();
      }
    });

    it("akceptuje polską małą literę (ą, ć, ę, ł, ń, ó, ś, ź, ż)", () => {
      const polishLowercaseLetters = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"];

      polishLowercaseLetters.forEach((letter) => {
        const validData = {
          email: "test@example.com",
          password: `A${letter}cdefg1`,
          confirmPassword: `A${letter}cdefg1`,
        };

        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Walidacja cyfry", () => {
    it("odrzuca hasło bez cyfry", () => {
      const invalidData = {
        email: "test@example.com",
        password: "Hasłotest",
        confirmPassword: "Hasłotest",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const digitError = result.error.issues.find((issue) => issue.message.includes("cyfrę"));
        expect(digitError).toBeDefined();
      }
    });

    it("akceptuje hasło z cyfrą na początku", () => {
      const validData = {
        email: "test@example.com",
        password: "1Hasłotest",
        confirmPassword: "1Hasłotest",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("akceptuje hasło z cyfrą w środku", () => {
      const validData = {
        email: "test@example.com",
        password: "Hasł0test",
        confirmPassword: "Hasł0test",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("akceptuje hasło z wieloma cyframi", () => {
      const validData = {
        email: "test@example.com",
        password: "Hasło123456",
        confirmPassword: "Hasło123456",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Walidacja dopasowania haseł", () => {
    it("odrzuca gdy hasła się nie zgadzają", () => {
      const invalidData = {
        email: "test@example.com",
        password: "Hasło123",
        confirmPassword: "InnéHasło123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("confirmPassword");
        expect(result.error.issues[0].message).toBe("Hasła muszą być takie same.");
      }
    });

    it("odrzuca gdy hasła różnią się wielkością liter", () => {
      const invalidData = {
        email: "test@example.com",
        password: "Hasło123",
        confirmPassword: "hasło123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Walidacja email", () => {
    it("odrzuca nieprawidłowy format email", () => {
      const invalidData = {
        email: "nieprawidlowy-email",
        password: "Hasło123",
        confirmPassword: "Hasło123",
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("akceptuje standardowy email z subdomeną", () => {
      const validData = {
        email: "test@mail.example.com",
        password: "Hasło123",
        confirmPassword: "Hasło123",
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe("ResetPasswordSchema", () => {
  describe("Poprawne dane", () => {
    it("akceptuje poprawny email", () => {
      const validData = {
        email: "reset@example.com",
      };

      const result = resetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Walidacja email", () => {
    it("odrzuca nieprawidłowy format email", () => {
      const invalidData = {
        email: "nieprawidlowy-email",
      };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Podaj poprawny adres e-mail.");
      }
    });

    it("odrzuca pusty email", () => {
      const invalidData = {
        email: "",
      };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("odrzuca email bez @", () => {
      const invalidData = {
        email: "testexample.com",
      };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("odrzuca email bez domeny", () => {
      const invalidData = {
        email: "test@",
      };

      const result = resetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe("UpdatePasswordSchema", () => {
  describe("Poprawne dane", () => {
    it("akceptuje poprawne hasła", () => {
      const validData = {
        password: "NoweHasło123",
        confirmPassword: "NoweHasło123",
      };

      const result = updatePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("Walidacja długości hasła", () => {
    it("odrzuca hasło krótsze niż 8 znaków", () => {
      const invalidData = {
        password: "Abc123",
        confirmPassword: "Abc123",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Hasło powinno zawierać co najmniej 8 znaków.");
      }
    });
  });

  describe("Walidacja wielkiej litery", () => {
    it("odrzuca hasło bez wielkiej litery", () => {
      const invalidData = {
        password: "hasło1234",
        confirmPassword: "hasło1234",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const upperCaseError = result.error.issues.find((issue) =>
          issue.message.includes("wielką literę")
        );
        expect(upperCaseError).toBeDefined();
      }
    });
  });

  describe("Walidacja małej litery", () => {
    it("odrzuca hasło bez małej litery", () => {
      const invalidData = {
        password: "HASŁO1234",
        confirmPassword: "HASŁO1234",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const lowerCaseError = result.error.issues.find((issue) =>
          issue.message.includes("małą literę")
        );
        expect(lowerCaseError).toBeDefined();
      }
    });
  });

  describe("Walidacja cyfry", () => {
    it("odrzuca hasło bez cyfry", () => {
      const invalidData = {
        password: "Hasłotest",
        confirmPassword: "Hasłotest",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const digitError = result.error.issues.find((issue) => issue.message.includes("cyfrę"));
        expect(digitError).toBeDefined();
      }
    });
  });

  describe("Walidacja dopasowania haseł", () => {
    it("odrzuca gdy hasła się nie zgadzają", () => {
      const invalidData = {
        password: "NoweHasło123",
        confirmPassword: "InneHasło123",
      };

      const result = updatePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("confirmPassword");
        expect(result.error.issues[0].message).toBe("Hasła muszą być takie same.");
      }
    });

    it("akceptuje identyczne hasła", () => {
      const validData = {
        password: "Identyczne123",
        confirmPassword: "Identyczne123",
      };

      const result = updatePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

