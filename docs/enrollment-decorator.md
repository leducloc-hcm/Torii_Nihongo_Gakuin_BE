# Enrollment Decorator Documentation

The `@RequireEnrollment` decorator is used to protect routes that require users to be enrolled in a specific course. It works in conjunction with the `EnrollmentGuard` to verify that the authenticated user has an active enrollment for the requested course.

## Usage

### Basic Usage

```typescript
import { RequireEnrollment } from 'src/shared/decorators/enrollmented.decorator'
import { EnrollmentGuard } from 'src/shared/guards/enrollment.guard'

@Controller('lessons')
@UseGuards(RolesGuard, EnrollmentGuard) // Add EnrollmentGuard to your guards
export class LessonController {
  @Get('course/:courseId')
  @Auth([AuthType.Bearer])
  @Roles(RoleName.Customer)
  @RequireEnrollment() // Uses default options
  async findByCourse(@Param('courseId', ParseIntPipe) courseId: number) {
    // Only enrolled users can access this endpoint
    return this.lessonService.findByCourse(courseId)
  }
}
```

### Advanced Usage with Options

```typescript
@Get('course/:courseId/premium-content')
@Auth([AuthType.Bearer])
@Roles(RoleName.Customer)
@RequireEnrollment({
  courseIdParam: 'courseId',    // Parameter name containing course ID (default: 'courseId')
  requireActive: true,          // Check if enrollment is not expired (default: true)
  allowAdmin: false,           // Don't allow admin bypass for this endpoint (default: true)
})
async getPremiumContent(@Param('courseId', ParseIntPipe) courseId: number) {
  // Only active enrolled users can access premium content
  return this.lessonService.getPremiumContent(courseId)
}
```

### Custom Parameter Name

```typescript
@Get('module/:moduleId/lessons')
@Auth([AuthType.Bearer])
@Roles(RoleName.Customer)
@RequireEnrollment({
  courseIdParam: 'moduleId', // Will extract course ID from module parameter
  requireActive: true,
})
async getLessonsByModule(@Param('moduleId', ParseIntPipe) moduleId: number) {
  // Implementation should handle extracting courseId from moduleId
  return this.lessonService.findByModule(moduleId)
}
```

## Options

### `EnrollmentCheckOptions`

| Option          | Type      | Default      | Description                                                   |
| --------------- | --------- | ------------ | ------------------------------------------------------------- |
| `courseIdParam` | `string`  | `'courseId'` | Name of the route parameter that contains the course ID       |
| `requireActive` | `boolean` | `true`       | Whether to check if enrollment is active (not expired)        |
| `allowAdmin`    | `boolean` | `true`       | Whether to allow admin/staff users to bypass enrollment check |

## Guard Setup

Make sure to include the `EnrollmentGuard` in your controller's guards:

```typescript
@Controller('protected-resource')
@UseGuards(RolesGuard, EnrollmentGuard) // Include both guards
export class ProtectedController {
  // ...
}
```

## Error Responses

The decorator will throw the following exceptions:

- `ForbiddenException`: User is not enrolled in the course
- `ForbiddenException`: User's enrollment has expired (when `requireActive: true`)
- `BadRequestException`: Course ID parameter is missing or invalid
- `ForbiddenException`: User not authenticated

## Examples by Role

### Customer Access

- Customers must be enrolled in the course
- Enrollment must be active (unless `requireActive: false`)

### Admin/Staff Access

- By default, admin and staff can bypass enrollment checks
- Set `allowAdmin: false` to require enrollment even for admin/staff

### Lecturer Access

- Lecturers are treated like regular users and need enrollment
- Consider using role-based access for lecturer-specific endpoints

## Best Practices

1. **Always use with authentication**: Combine with `@Auth()` and role decorators
2. **Order matters**: Place `EnrollmentGuard` after `RolesGuard` in the guards array
3. **Course ID validation**: Ensure the course ID parameter is properly validated
4. **Error handling**: Provide clear error messages to users
5. **Admin bypass**: Consider whether admin users should bypass enrollment checks

## Implementation Notes

- The guard uses `ModuleRef` to avoid circular dependencies
- Enrollment status is checked in real-time (no caching)
- The guard respects the existing role-based permissions
- Expired enrollments are treated as no enrollment when `requireActive: true`
