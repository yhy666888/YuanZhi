import { useRef, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "time" | "date" | "datetime-local";
};

/** 时间/日期输入框：点击任意位置都弹出选择器（不仅限右侧按钮） */
export function PickerInput({ type, onClick, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type={type}
      onClick={(e) => {
        try {
          (e.currentTarget as HTMLInputElement).showPicker();
        } catch {
          /* 不支持 showPicker 的浏览器忽略 */
        }
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
