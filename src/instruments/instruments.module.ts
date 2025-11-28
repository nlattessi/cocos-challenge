import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instrument } from './instrument.entity';
import { InstrumentsController } from './instruments.controller';
import { InstrumentsService } from './instruments.service';

@Module({
    imports: [TypeOrmModule.forFeature([Instrument])],
    providers: [InstrumentsService],
    controllers: [InstrumentsController],
    exports: [InstrumentsService],
})
export class InstrumentsModule { }
