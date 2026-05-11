#!/bin/bash

# 아바타 모듈 정적 페이지 배포 배치
# Step 1: Vite 빌드
npm run build

# Step 2: B 레포 클론
git clone https://github.com/<your-username>/<B-repo>.git

# Step 3: dist → B 레포로 복사
cp -r dist/* <B-repo>/

# Step 4: B 레포로 이동 후 gh-pages 배포
cd <B-repo>

git checkout -b gh-pages
git add .
git commit -m "Deploy from A repo"
git push origin gh-pages

# Step 5: 정리
cd ..
rm -rf <B-repo>

echo "✅ Deployment completed!"
