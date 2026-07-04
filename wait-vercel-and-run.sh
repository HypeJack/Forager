#!/bin/bash
echo "Waiting for Vercel deploy to reach Ready..."
while true; do
  output=$(npx vercel ls --prod 2>/dev/null)
  if echo "$output" | head -n 15 | grep "Building"; then
    echo -n "."
    sleep 5
  else
    echo -e "\nVercel deployment is Ready!"
    break
  fi
done

START_TIME=$(node -e "console.log(new Date().toISOString())")
echo "Start time: $START_TIME"

npx tsx trigger-scout-prod.ts
echo "Waiting 5 seconds..."
sleep 5
npx tsx wait-for-scout.ts "$START_TIME"
npx tsx run-gates.ts "$START_TIME"
