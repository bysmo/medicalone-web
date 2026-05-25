import os
import re

entity_dir = "/Users/modestemariebegninesomda/IdeaProjects/alphacure/patient-service/src/main/java/com/altes/alphacure/patient/entity"

for filename in os.listdir(entity_dir):
    if filename.endswith(".java"):
        filepath = os.path.join(entity_dir, filename)
        with open(filepath, "r") as f:
            content = f.read()

        # Remove the columnDefinition = "CHAR(36)"
        content = re.sub(r',\s*columnDefinition\s*=\s*"CHAR\(36\)"', '', content)
        content = re.sub(r'columnDefinition\s*=\s*"CHAR\(36\)"\s*,?', '', content)

        # Add @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR) to all UUID fields
        lines = content.split('\n')
        new_lines = []
        for i, line in enumerate(lines):
            if line.strip().startswith('private UUID '):
                # Check if previous lines already have JdbcTypeCode to avoid duplicates
                has_jdbc = False
                for j in range(i-1, max(-1, i-5), -1):
                    if 'JdbcTypeCode' in lines[j] or '}' in lines[j] or ';' in lines[j]:
                        if 'JdbcTypeCode' in lines[j]: has_jdbc = True
                        break
                if not has_jdbc:
                    # Find the last annotation before this field
                    insert_idx = i
                    for j in range(i-1, -1, -1):
                        if not lines[j].strip().startswith('@'):
                            insert_idx = j + 1
                            break
                    new_lines.insert(len(new_lines) - (i - insert_idx), '    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)')
            new_lines.append(line)

        with open(filepath, "w") as f:
            f.write('\n'.join(new_lines))

print("Fixed UUID mappings.")
