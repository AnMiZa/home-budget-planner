import type { ComponentType } from "react";
import type {
  HouseholdMemberDto,
  CategoryDto,
  CreateHouseholdMemberCommand,
  UpdateHouseholdMemberCommand,
  CreateCategoryCommand,
  UpdateCategoryCommand,
} from "@/types";

/**
 * ViewModel for household member (extends DTO for future UI-specific fields)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HouseholdMemberVM extends HouseholdMemberDto {
  // Currently identical to DTO, but allows for future extensions
}

/**
 * ViewModel for category (extends DTO for future UI-specific fields)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CategoryVM extends CategoryDto {
  // Possible future extensions: hasTransactions, transactionCount
}

/**
 * Navigation item data for settings sections
 */
export interface SettingsNavItemData {
  readonly href?: string;
  readonly label: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly description: string;
  readonly onClick?: () => void;
}

/**
 * Form values for household member
 */
export interface HouseholdMemberFormValues {
  readonly fullName: string;
}

/**
 * Form values for category
 */
export interface CategoryFormValues {
  readonly name: string;
}

/**
 * Operation type for result banners
 */
export type OperationType = "create" | "update" | "delete";

/**
 * Operation result for success/error banners
 */
export interface OperationResult {
  readonly type: OperationType;
  readonly status: "success" | "error";
  readonly message: string;
}

/**
 * Settings-specific error
 */
export interface SettingsError {
  readonly status: number;
  readonly message: string;
  readonly code?: string;
}

// Re-export commands for convenience
export type {
  CreateHouseholdMemberCommand,
  UpdateHouseholdMemberCommand,
  CreateCategoryCommand,
  UpdateCategoryCommand,
};
