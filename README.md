# SpeakWise Studio

涓€涓潰鍚戔€滆璇濊壓鏈€濊缁冪殑澶氱椤圭洰鍩哄骇銆傚綋鍓嶇増鏈寘鍚細

- `apps/client`锛氬熀浜?Taro + React 鐨勫绔墠绔紝浼樺厛闈㈠悜寰俊/鎶栭煶灏忕▼搴?- `apps/server`锛歂ode.js + Express API锛屾彁渚涘満鏅€侀噾鍙ャ€佽瘎鍒嗐€佺櫥褰曘€佽缁冭褰曟帴鍙?- `docs`锛氫骇鍝佹柟妗堛€佹灦鏋勮鏄庝笌鍚庣画瑙勫垝

## 褰撳墠鑳藉姏

- 棣栭〉灞曠ず璁粌鍏ュ彛銆侀噾鍙ュ拰琛ㄨ揪鍘熷垯
- 鍦烘櫙闂叧缁冧範
- 鏂囧瓧璇勫垎涓?DeepSeek 鐐硅瘎
- 璇煶褰曞埗鍏ュ彛銆佷笂浼犳帴鍙ｅ拰杞啓鏈嶅姟鎶借薄
- 鐧诲綍銆佹垚闀块〉銆佽缁冭褰曚繚瀛?- 鏀寔 DeepSeek / OpenAI / 鏈湴瑙勫垯涓夌璇勫垎妯″紡

## 鎺ㄨ崘寮€鍙戦『搴?
1. 瀹夎 Node.js 20 LTS
2. 鍦ㄦ牴鐩綍鎵ц `npm install`
3. 澶嶅埗 `.env.example` 涓?`.env`
4. 鍏堣繍琛屽悗绔細`npm run dev:server`
5. 鍐嶈繍琛屽墠绔細`npm run dev:client`

## 鐜鍙橀噺

- `AI_MODE=deepseek`锛氬綋鍓嶉粯璁よ瘎鍒嗘ā寮?- `TRANSCRIBE_MODE=disabled`锛氬綋鍓嶉粯璁ゅ叧闂湡瀹炶闊宠浆鍐?- `WECHAT_LOGIN_MODE=mock`锛氬綋鍓嶉粯璁ょ敤 mock 鐧诲綍鎵撻€氬井淇″紑鍙戣€呭伐鍏疯仈璋?- `WECHAT_APP_ID` / `WECHAT_APP_SECRET`锛氭湁鐪熷疄灏忕▼搴忛厤缃悗鍙垏鍒?live 鐧诲綍

## 寰俊寮€鍙戣€呭伐鍏疯仈璋?
- 宸茬敓鎴?`apps/client/project.config.json`
- 鏋勫缓鍚庝細鑷姩澶嶅埗鍒?`apps/client/dist/project.config.json`
- 褰撳墠鍙洿鎺ョ敤 `touristappid` 鍦ㄥ紑鍙戣€呭伐鍏峰仛鍩虹鑱旇皟

## 褰撳墠闄愬埗

- 璇煶褰曞埗鍓嶇宸茬粡鎺ュソ锛屼絾鐪熷疄杞啓杩橀渶瑕侀澶栭厤缃?OpenAI Key
- 褰撳墠鍓嶇榛樿璇锋眰 `http://localhost:4000`锛岀湡鏈洪瑙堟椂闇€瑕佹浛鎹㈡垚鍙闂殑鍚庣鍦板潃
- 寰俊鐧诲綍鐩墠鍏堣蛋 mock锛屽彧鏈夐厤涓婄湡瀹?AppID / Secret 鎵嶈兘鍒?live

## 鍚庣画寤鸿

涓嬩竴杞渶閫傚悎缁х画鍋氾細

1. 鏁版嵁搴撴寔涔呭寲
2. 鐪熷疄寰俊鐧诲綍
3. 鐪熸満鍚庣鍦板潃閰嶇疆
4. 璇煶杞啓璐ㄩ噺浼樺寲