import os

file_path = r'c:\Users\Admin\Desktop\Chat\ChappAt\app\signup\EducationSelectionScreen.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix validateAndNext
old_validate = """    if (selectedUniversity === 'Khác') {
      if (!customUniversity.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập trường đại học nếu chọn "Khác"');
        return;
      }
      finalUniversity = customUniversity.trim();
    }

    if (selectedJob === 'Khác') {
      if (!customJob.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập nghề nghiệp nếu chọn "Khác"');
        return;
      }
      finalJob = customJob.trim();
    }

    setLoading(true);
    setEducationLevel(finalLevel);
    setUniversity(finalUniversity);"""

new_validate = """    if (selectedLevel === 'Cao đẳng/Đại học' && selectedUniversity === 'Khác') {
      if (!customUniversity.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập trường đại học nếu chọn "Khác"');
        return;
      }
      finalUniversity = customUniversity.trim();
    }

    if (selectedJob === 'Khác') {
      if (!customJob.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập nghề nghiệp nếu chọn "Khác"');
        return;
      }
      finalJob = customJob.trim();
    }

    setLoading(true);
    setEducationLevel(finalLevel);
    if (selectedLevel === 'Cao đẳng/Đại học') {
      setUniversity(finalUniversity);
    } else {
      setUniversity('');
    }"""

content = content.replace(old_validate, new_validate)

# Fix isNextEnabled
old_isNextEnabled = """  const isNextEnabled = selectedLevel && selectedUniversity &&
    (selectedLevel !== 'Khác' || customLevel.trim()) &&
    (selectedUniversity !== 'Khác' || customUniversity.trim()) &&
    (!selectedJob || selectedJob !== 'Khác' || customJob.trim());"""

new_isNextEnabled = """  const isNextEnabled = selectedLevel && 
    (selectedLevel !== 'Cao đẳng/Đại học' || selectedUniversity) &&
    (selectedLevel !== 'Khác' || customLevel.trim()) &&
    (selectedLevel !== 'Cao đẳng/Đại học' || selectedUniversity !== 'Khác' || customUniversity.trim()) &&
    (!selectedJob || selectedJob !== 'Khác' || customJob.trim());"""

content = content.replace(old_isNextEnabled, new_isNextEnabled)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated EducationSelectionScreen.jsx")
