# Windows 鍚姩鎸囧崡

## 1. 瀹夎 Node.js

鍘?Node.js 瀹樼綉瀹夎 `20 LTS` 鐗堟湰锛屽畨瑁呭畬鎴愬悗閲嶆柊鎵撳紑缁堢銆?
## 2. 瀹夎椤圭洰渚濊禆

鍦ㄩ」鐩牴鐩綍鎵ц锛?
```powershell
npm install
```

## 3. 鍑嗗鐜鍙橀噺

鎶婃牴鐩綍鐨?`.env.example` 澶嶅埗鎴?`.env`锛?
```powershell
Copy-Item .env.example .env
```

## 4. 褰撳墠榛樿妯″紡

```env
AI_MODE=deepseek
TRANSCRIBE_MODE=disabled
WECHAT_LOGIN_MODE=mock
```

杩欒〃绀猴細

- 鏂囧瓧璇勫垎璧?DeepSeek
- 璇煶褰曞埗鍏ュ彛鍙敤锛屼絾鐪熷疄杞啓榛樿鍏抽棴
- 寰俊寮€鍙戣€呭伐鍏烽噷鍏堣蛋 mock 鐧诲綍鑱旇皟

## 5. 鍚姩鍚庣

```powershell
npm run dev:server
```

## 6. 鍚姩鍓嶇

```powershell
npm run dev:client
```

## 7. 寰俊寮€鍙戣€呭伐鍏锋墦寮€鏂瑰紡

鐩存帴鎵撳紑锛?
- `C:/Users/v_hoxqin/Documents/codex/apps/client/dist`

褰撳墠宸茬粡甯︿笂 `project.config.json`锛岄粯璁?`appid` 涓?`touristappid`锛岄€傚悎鍏堣窇椤甸潰鍜屾帴鍙ｈ仈璋冦€?
## 8. 鍒囧埌鐪熷疄寰俊鐧诲綍

褰撲綘鏈夎嚜宸辩殑灏忕▼搴忛厤缃悗锛?
1. 鍦?`.env` 鍜?`apps/server/.env` 濉笂 `WECHAT_APP_ID`
2. 濉笂 `WECHAT_APP_SECRET`
3. 鎶?`WECHAT_LOGIN_MODE=mock` 鏀规垚 `WECHAT_LOGIN_MODE=live`
4. 閲嶅惎鍚庣

## 9. 鎵撳紑鐪熷疄璇煶杞啓

濡傛灉浣犱箣鍚庢湁 OpenAI Key锛?
1. 濉啓 `OPENAI_API_KEY`
2. 鎶?`TRANSCRIBE_MODE=disabled` 鏀规垚 `TRANSCRIBE_MODE=openai`
3. 閲嶅惎鍚庣

## 10. 褰撳墠宸插畬鎴愰〉闈?
- 棣栭〉
- 鍦烘櫙缁冧範椤?- 鎶ュ憡椤?- 鎴戠殑鎴愰暱椤?
## 11. 褰撳墠宸插畬鎴愰摼璺?
- 鐧诲綍
- 璁粌璁板綍淇濆瓨
- 寰俊寮€鍙戣€呭伐鍏峰熀纭€鑱旇皟閰嶇疆
- DeepSeek 璇勫垎