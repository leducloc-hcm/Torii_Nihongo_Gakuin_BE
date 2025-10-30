export enum QueryType {
  COURSE = 'COURSE',
  GENERAL = 'GENERAL',
}

export function detectQueryType(query: string): QueryType {
  const lowerQuery = query.toLowerCase()

  if (
    lowerQuery.includes('course') ||
    lowerQuery.includes('コース') ||
    lowerQuery.includes('khóa học') ||
    lowerQuery.includes('enroll') ||
    lowerQuery.includes('module')
  ) {
    return QueryType.COURSE
  }

  return QueryType.GENERAL
}
