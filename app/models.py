from pydantic import BaseModel


class DailyRecord(BaseModel):
    date: str  # 日付 (例: "1", "2", ... "31")
    day_of_week: str  # 曜日 (例: "月", "火", ...)
    clock_in: str  # 出勤時刻 (例: "8:00")
    clock_out: str  # 退勤時刻 (例: "17:00")
    break_minutes: str  # 休憩時間(分) (例: "60")
    working_hours: str  # 実働時間 (例: "8.00")
    overtime: str  # 契約外時間 (例: "0.00")
    remarks: str  # 備考
    manager: str  # 管理者確認


class TimecardData(BaseModel):
    employee_name: str  # 従業員名
    year: str  # 年
    month: str  # 月
    contract_period: str  # 契約期間 (例: "2025年2月1日 ～ 2026年1月31日")
    records: list[DailyRecord]  # 日ごとの記録
