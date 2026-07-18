import { toast as sonnerToast } from "sonner";

// Define a unified error structure
interface ApiError {
  message: string;
  code?: string;
}

export const notify = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  },
  
  // The Parser: Handles raw strings, standard Errors, or custom API objects
  error: (err: unknown, fallbackMessage = "Something went wrong") => {
    let message = fallbackMessage;
    let description: string | undefined;

    if (typeof err === "string") {
      message = err;
    } else if (err instanceof Error) {
      message = err.message;
    } else if (err && typeof err === "object" && "message" in err) {
      message = (err as ApiError).message;
      description = (err as ApiError).code;
    }

    sonnerToast.error(message, { description });
  },

  info: (message: string) => sonnerToast.info(message),
  
  warning: (message: string) => sonnerToast.warning(message),
};