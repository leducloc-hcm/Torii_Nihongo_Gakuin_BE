export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // thêm tính năng mới
        'fix', // sửa lỗi
        'chore', // thay đổi nhỏ không ảnh hưởng logic
        'docs', // cập nhật tài liệu
        'refactor', // cải tổ code
        'test', // thêm / sửa test
        'build', // chỉnh build system
        'ci', // thay đổi CI/CD workflow
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
  },
}
