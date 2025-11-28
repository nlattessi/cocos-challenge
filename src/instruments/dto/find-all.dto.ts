import { IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class FindAllInstrumentsDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @IsOptional()
    query?: string;
}