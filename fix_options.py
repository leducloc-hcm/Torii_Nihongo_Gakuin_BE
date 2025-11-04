import re

files = [
    'src/routes/assessment-paper/assessment-paper.repo.ts',
    'src/routes/assessment-section/assessment-section.repo.ts',
    'src/routes/question-group/question-group.repo.ts',
    'src/routes/question/question.repo.ts',
    'src/routes/quiz-answer/quiz-answer.repo.ts',
    'src/routes/quiz-attempt/quiz-attempt.repo.ts',
    'src/routes/quiz-item/quiz-item.repo.ts',
    'src/routes/quiz/quiz.repo.ts'
]

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace option: with options:
        content = re.sub(r'\boption:', 'options:', content)
        # Replace .option with .options
        content = re.sub(r'\.option\b', '.options', content)
        # Replace question.option with question.options
        content = content.replace('question.option', 'question.options')
        content = content.replace('original.option', 'original.options')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    except Exception as e:
        print(f"Error in {filepath}: {e}")
