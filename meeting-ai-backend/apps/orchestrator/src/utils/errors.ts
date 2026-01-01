export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Distinguishes from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = "Resource") {
        super(`${resource} not found`, 404);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = "Bad request") {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized") {
        super(message, 401);
    }
}

export class InsufficientDataError extends AppError {
    constructor(message: string = "Insufficient data") {
        super(message, 400);
    }
}
