import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SeasonalEventService } from "./seasonal-event.service";
import { IsPublic } from "src/shared/decorators/auth.decorator";
import {
  CreateSeasonalEventDTO,
  UpdateSeasonalEventDTO,
} from "./seasonal-event.dto";

@ApiTags("Seasonal Events")
@ApiBearerAuth()
@Controller("gamification/seasonal-events")
export class SeasonalEventController {
  constructor(private readonly seasonalEventService: SeasonalEventService) {}

  @Get()
  @IsPublic()
  @ApiOperation({ summary: "List all seasonal events" })
  listEvents() {
    return this.seasonalEventService.listEvents();
  }

  @Get("active")
  @IsPublic()
  @ApiOperation({ summary: "Get the currently active event multiplier" })
  getActiveMultiplier() {
    return this.seasonalEventService.getActiveMultiplier();
  }

  @Post()
  @ApiOperation({ summary: "Create a seasonal event (admin)" })
  createEvent(@Body() body: CreateSeasonalEventDTO) {
    return this.seasonalEventService.createEvent(body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a seasonal event (admin)" })
  updateEvent(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateSeasonalEventDTO,
  ) {
    return this.seasonalEventService.updateEvent(id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a seasonal event (admin)" })
  deleteEvent(@Param("id", ParseIntPipe) id: number) {
    return this.seasonalEventService.deleteEvent(id);
  }
}
