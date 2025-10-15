import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { ModuleRepository } from './module.repo'
import { CreateModuleDTO, UpdateModuleDTO, QueryModuleDTO } from './module.dto'
import { ModuleWithRelations, ModuleWhereInput, ModuleOrderByInput } from './module.model'

@Injectable()
export class ModuleService {
  constructor(private readonly moduleRepository: ModuleRepository) {}

  async create(createModuleDto: CreateModuleDTO): Promise<ModuleWithRelations> {
    const { courseId, title, order } = createModuleDto

    // Check if course exists
    const courseExists = await this.moduleRepository.checkCourseExists(courseId)
    if (!courseExists) {
      throw new BadRequestException(`Course with ID ${courseId} does not exist`)
    }

    // If no order is provided, set it to the next available order
    let moduleOrder = order
    if (moduleOrder === undefined) {
      const maxOrder = await this.moduleRepository.getMaxOrder(courseId)
      moduleOrder = maxOrder + 1
    }

    return this.moduleRepository.create({
      courseId,
      title,
      order: moduleOrder,
    })
  }

  async findAll(queryDto: QueryModuleDTO) {
    const { page, limit, search, courseId, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * Number(limit)

    // Build where clause
    const where: ModuleWhereInput = {}

    if (search) {
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }]
    }

    if (courseId) {
      where.courseId = courseId
    }

    // Build orderBy clause
    const orderBy: ModuleOrderByInput = {}
    if (sortBy === 'order') {
      orderBy.order = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    }

    const { modules, total } = await this.moduleRepository.findAll({
      skip,
      take: Number(limit),
      where,
      orderBy,
    })

    return {
      data: modules,
      meta: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }
  }

  async findOne(id: number): Promise<ModuleWithRelations> {
    const module = await this.moduleRepository.findOne({ id })

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`)
    }

    return module
  }

  async update(id: number, updateModuleDto: UpdateModuleDTO): Promise<ModuleWithRelations> {
    // Check if module exists
    await this.findOne(id)

    return this.moduleRepository.update({
      where: { id },
      data: updateModuleDto,
    })
  }

  async remove(id: number): Promise<ModuleWithRelations> {
    // Check if module exists
    const module = await this.findOne(id)

    // Delete the module (cascade will handle related entities)
    await this.moduleRepository.delete({ id })

    return module
  }

  async findByCourse(courseId: number, queryDto: Omit<QueryModuleDTO, 'courseId'>) {
    const { page, limit, search, sortBy, sortOrder } = queryDto
    const skip = (page - 1) * Number(limit)

    // Build where clause (excluding courseId since it's passed separately)
    const where: Omit<ModuleWhereInput, 'courseId'> = {}

    if (search) {
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }]
    }

    // Build orderBy clause
    const orderBy: ModuleOrderByInput = {}
    if (sortBy === 'order') {
      orderBy.order = sortOrder
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder
    }

    const { modules, total } = await this.moduleRepository.findByCourse(courseId, {
      skip,
      take: Number(limit),
      where,
      orderBy,
    })

    return {
      data: modules,
      meta: {
        page,
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }
  }

  async reorderModules(courseId: number, moduleOrders: { id: number; order: number }[]): Promise<void> {
    // Check if course exists
    const courseExists = await this.moduleRepository.checkCourseExists(courseId)
    if (!courseExists) {
      throw new BadRequestException(`Course with ID ${courseId} does not exist`)
    }

    // Validate that all module IDs exist and belong to the course
    const moduleIds = moduleOrders.map((m) => m.id)
    const { modules } = await this.moduleRepository.findByCourse(courseId, {
      take: 1000, // Large number to get all modules
    })

    const existingModuleIds = modules.map((m) => m.id)
    const invalidIds = moduleIds.filter((id) => !existingModuleIds.includes(id))

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Module IDs [${invalidIds.join(', ')}] do not exist in course ${courseId}`)
    }

    await this.moduleRepository.reorderModules(courseId, moduleOrders)
  }
}
