git init
git add .
git commit -m "Initial commit"
git branch -M main
if (git remote | Select-String "origin") {
    git remote set-url origin https://github.com/AbizerBadami/al-saifee-perfume.git
} else {
    git remote add origin https://github.com/AbizerBadami/al-saifee-perfume.git
}
git push -u origin main
