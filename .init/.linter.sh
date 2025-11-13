#!/bin/bash
cd /home/kavia/workspace/code-generation/conversational-ai-interface-224112/frontend_web_ui
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

