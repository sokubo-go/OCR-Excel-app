from pydantic import BaseModel


class DailyRecord(BaseModel):
    date: str  # 日付 (例: "1", "2", ... "31")
    day_of_week: str  # 曜日 (例: "月", "火", ...)
    clock_in: str  # 出勤時刻 (例: "09:00")
    clock_out: str  # 退勤時刻 (例: "18:00")
    break_time: str  # 休憩時間 (例: "1:00")
    working_hours: str  # 勤務時間 (例: "8:00")
    overtime: str  # 残業時間 (例: "0:00")
    remarks: str  # 備考


class TimecardData(BaseModel):
    employee_name: str  # 従業員名
    year: str  # 年
    month: str  # 月
    records: list[DailyRecord]  # 日ごとの記録
