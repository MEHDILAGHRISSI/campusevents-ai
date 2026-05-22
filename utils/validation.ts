/**
 * Form validation utilities for CampusEvents
 * Provides simple, lightweight validation without external dependencies
 */

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

// Validators
const validators = {
  required: (value: unknown, fieldName: string): ValidationError | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  },

  email: (value: string, fieldName: string): ValidationError | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { field: fieldName, message: `${fieldName} must be a valid email` };
    }
    return null;
  },

  minLength: (value: string, min: number, fieldName: string): ValidationError | null => {
    if (value.length < min) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${min} characters long`,
      };
    }
    return null;
  },

  maxLength: (value: string, max: number, fieldName: string): ValidationError | null => {
    if (value.length > max) {
      return {
        field: fieldName,
        message: `${fieldName} must be no more than ${max} characters long`,
      };
    }
    return null;
  },

  isoDateTime: (value: string, fieldName: string): ValidationError | null => {
    const normalized = typeof value === 'string' && value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const date = new Date(normalized as string);
    if (isNaN(date.getTime())) {
      return { field: fieldName, message: `${fieldName} must be a valid date` };
    }
    return null;
  },

  futureDate: (value: string, fieldName: string): ValidationError | null => {
    const normalized = typeof value === 'string' && value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const date = new Date(normalized as string);
    if (date <= new Date()) {
      return { field: fieldName, message: `${fieldName} must be in the future` };
    }
    return null;
  },

  positiveNumber: (value: number, fieldName: string): ValidationError | null => {
    if (value <= 0) {
      return { field: fieldName, message: `${fieldName} must be a positive number` };
    }
    return null;
  },

  url: (value: string, fieldName: string): ValidationError | null => {
    try {
      new URL(value);
      return null;
    } catch {
      return { field: fieldName, message: `${fieldName} must be a valid URL` };
    }
  },
};

// Event validation schema
export const eventValidationRules = {
  title: [
    (v: string) => validators.required(v, 'Title'),
    (v: string) => validators.minLength(v, 3, 'Title'),
    (v: string) => validators.maxLength(v, 200, 'Title'),
  ],
  description: [
    (v: string) => validators.required(v, 'Description'),
    (v: string) => validators.minLength(v, 10, 'Description'),
    (v: string) => validators.maxLength(v, 2000, 'Description'),
  ],
  startDateTime: [
    (v: string) => validators.required(v, 'Start date'),
    (v: string) => validators.isoDateTime(v, 'Start date'),
    (v: string) => validators.futureDate(v, 'Start date'),
  ],
  endDateTime: [
    (v: string | undefined) => {
      if (!v) return null;
      const startError = validators.isoDateTime(v, 'End date');
      return startError;
    },
  ],
  locationName: [
    (v: string) => validators.required(v, 'Location'),
    (v: string) => validators.minLength(v, 3, 'Location'),
  ],
  capacity: [
    (v: number | undefined) => {
      if (v === undefined || v === null) return null;
      if (!Number.isInteger(v) || v <= 0) {
        return {
          field: 'capacity',
          message: 'La capacité doit être un nombre entier positif supérieur à 0',
        };
      }
      return null;
    },
  ],
  imageUrl: [
    (v: string | undefined) => {
      if (!v) return null;
      return validators.url(v, 'Image URL');
    },
  ],
  tags: [
    (v: string | undefined) => {
      if (!v) return null;
      const tags = v.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 20) {
        return { field: 'Tags', message: 'Maximum 20 tags allowed' };
      }
      for (const tag of tags) {
        if (tag.length > 50) {
          return { field: 'Tags', message: 'Each tag must be 50 characters or less' };
        }
      }
      return null;
    },
  ],
};

/**
 * Validate a single field
 */
export function validateField(
  fieldName: keyof typeof eventValidationRules,
  value: unknown
): ValidationError | null {
  const rules = eventValidationRules[fieldName];
  if (!rules) return null;

  for (const rule of rules) {
    const error = rule(value as any);
    if (error) return error;
  }

  return null;
}

/**
 * Validate entire event form
 */
export function validateEventForm(formData: {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime?: string;
  locationName: string;
  capacity?: number;
  imageUrl?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [fieldName, value] of Object.entries(formData)) {
    const error = validateField(fieldName as keyof typeof eventValidationRules, value);
    if (error) {
      errors.push(error);
    }
  }

  if (formData.endDateTime) {
    const start = new Date(
      typeof formData.startDateTime === 'string' && formData.startDateTime.includes(' ') && !formData.startDateTime.includes('T')
        ? formData.startDateTime.replace(' ', 'T')
        : formData.startDateTime
    );
    const end = new Date(
      typeof formData.endDateTime === 'string' && formData.endDateTime.includes(' ') && !formData.endDateTime.includes('T')
        ? formData.endDateTime.replace(' ', 'T')
        : formData.endDateTime
    );

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() <= start.getTime()) {
      errors.push({
        field: 'endDateTime',
        message: 'La date de fin doit être strictement postérieure à la date de début',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get error message for a specific field
 */
export function getFieldError(
  errors: ValidationError[],
  fieldName: string
): string | null {
  return errors.find((e) => e.field === fieldName)?.message ?? null;
}
