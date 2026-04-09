import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./index.scss";

type BottomTabKey = "home" | "practice" | "record" | "square" | "profile";

const tabs: Array<{ key: BottomTabKey; label: string; icon: BottomTabKey; center?: boolean }> = [
  { key: "home", label: "首页", icon: "home" },
  { key: "practice", label: "练习场", icon: "practice" },
  { key: "record", label: "开始练", icon: "record", center: true },
  { key: "square", label: "广场", icon: "square" },
  { key: "profile", label: "我的", icon: "profile" }
];

export default function V2BottomNav({ active }: { active: BottomTabKey }) {
  function handleNavigate(key: BottomTabKey) {
    if (key === active) {
      return;
    }

    if (key === "home") {
      Taro.reLaunch({ url: "/pages/home-v2/index" });
      return;
    }

    if (key === "practice" || key === "record") {
      Taro.reLaunch({ url: "/pages/practice-v2/index" });
      return;
    }

    if (key === "square") {
      Taro.reLaunch({ url: "/pages/square-v2/index" });
      return;
    }

    if (key === "profile") {
      Taro.reLaunch({ url: "/pages/profile-v2/index" });
    }
  }

  return (
    <View className='v2-bottom-nav'>
      {tabs.map((item) => (
        <View
          key={item.key}
          className={`v2-bottom-nav-item ${active === item.key ? "v2-bottom-nav-item-active" : ""} ${item.center ? "v2-bottom-nav-item-center" : ""}`}
          onClick={() => handleNavigate(item.key)}
        >
          <View className='v2-bottom-nav-icon'>
            <View className={`v2-bottom-nav-glyph v2-bottom-nav-glyph-${item.icon}`} />
          </View>
          <Text className='v2-bottom-nav-label'>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
