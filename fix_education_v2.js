const fs = require('fs');
const path = 'c:\\Users\\Admin\\Desktop\\Chat\\ChappAt\\app\\signup\\EducationSelectionScreen.jsx';

let content = fs.readFileSync(path, 'utf8');

// Use regex to match the blocks, ignoring potential encoding issues with "Khác"
const validateRegex = /if \(selectedUniversity === ['"].*?['"]\) \{[\s\S]*?finalUniversity = customUniversity\.trim\(\);\s*\}\s*if \(selectedJob === ['"].*?['"]\) \{[\s\S]*?finalJob = customJob\.trim\(\);\s*\}\s*setLoading\(true\);\s*setEducationLevel\(finalLevel\);\s*setUniversity\(finalUniversity\);/;

const newValidate = `if (selectedLevel === 'Cao đẳng/Đại học' && selectedUniversity === 'Khác') {
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
    }`;

if (validateRegex.test(content)) {
    content = content.replace(validateRegex, newValidate);
    console.log('Matched and replaced validateAndNext block');
} else {
    console.log('Could not match validateAndNext block');
}

const isNextEnabledRegex = /const isNextEnabled = selectedLevel && selectedUniversity &&\s*\(selectedLevel !== ['"].*?['"] \|\| customLevel\.trim\(\)\) &&\s*\(selectedUniversity !== ['"].*?['"] \|\| customUniversity\.trim\(\)\) &&\s*\(!selectedJob \|\| selectedJob !== ['"].*?['"] \|\| customJob\.trim\(\)\);/;

const newIsNextEnabled = `const isNextEnabled = selectedLevel && 
    (selectedLevel !== 'Cao đẳng/Đại học' || selectedUniversity) &&
    (selectedLevel !== 'Khác' || customLevel.trim()) &&
    (selectedLevel !== 'Cao đẳng/Đại học' || selectedUniversity !== 'Khác' || customUniversity.trim()) &&
    (!selectedJob || selectedJob !== 'Khác' || customJob.trim());`;

if (isNextEnabledRegex.test(content)) {
    content = content.replace(isNextEnabledRegex, newIsNextEnabled);
    console.log('Matched and replaced isNextEnabled block');
} else {
    console.log('Could not match isNextEnabled block');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Finished script');
