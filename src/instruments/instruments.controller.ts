import { ClassSerializerInterceptor, Controller, Get, Query, SerializeOptions, UseInterceptors } from '@nestjs/common';
import { FindAllInstrumentsDto } from './dto/find-all.dto';
import { Instrument } from './instrument.entity';
import { InstrumentsService } from './instruments.service';

@Controller('instruments')
export class InstrumentsController {
    constructor(private readonly instrumentsService: InstrumentsService) { }

    @UseInterceptors(ClassSerializerInterceptor)
    @SerializeOptions({ type: Instrument })
    @Get()
    findAll(@Query() findAllDto: FindAllInstrumentsDto): Promise<Instrument[]> {
        return this.instrumentsService.findAll(findAllDto)
    }
}
