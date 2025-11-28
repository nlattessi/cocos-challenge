import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { OrderSide, OrderType } from "../orders.enums";

export class CreateOrderRequestDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    accountNumber: string;

    @IsEnum(OrderType)
    type: OrderType;

    @IsEnum(OrderSide)
    side: OrderSide;

    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @IsOptional()
    ticker?: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(100000000)
    @IsOptional()
    size?: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(100000000)
    @IsOptional()
    ars?: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    @Max(100000000)
    @IsOptional()
    price?: number;
}