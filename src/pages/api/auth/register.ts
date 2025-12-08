import type { APIRoute } from "astro";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.client";

const registerSchema = z
  .object({
    email: z.string().email("Podaj poprawny adres e-mail."),
    password: z
      .string()
      .min(8, "Hasło powinno zawierać co najmniej 8 znaków.")
      .regex(/[A-ZĄĆĘŁŃÓŚŹŻ]/, "Dodaj przynajmniej jedną wielką literę.")
      .regex(/[a-ząćęłńóśźż]/, "Dodaj przynajmniej jedną małą literę.")
      .regex(/\d/, "Dodaj przynajmniej jedną cyfrę."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hasła muszą być takie same.",
  });

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe.",
          details: validationResult.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email, password } = validationResult.data;

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      // Handle specific Supabase errors
      let errorMessage = "Wystąpił błąd podczas rejestracji.";
      
      if (error.message.includes("User already registered")) {
        errorMessage = "Użytkownik z tym adresem e-mail już istnieje.";
      } else if (error.message.includes("Password")) {
        errorMessage = "Hasło nie spełnia wymagań bezpieczeństwa.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!data.user) {
      return new Response(
        JSON.stringify({
          error: "Nie udało się utworzyć konta.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

