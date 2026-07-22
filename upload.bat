@echo off
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/AbizerBadami/al-saifee-perfume.git || git remote set-url origin https://github.com/AbizerBadami/al-saifee-perfume.git
git push -u origin main
