import io

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.models import TimecardData

# スタイル定義
HEADER_FONT = Font(name="Yu Gothic", bold=True, size=11)
HEADER_FILL = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
HEADER_FONT_WHITE = Font(name="Yu Gothic", bold=True, size=11, color="FFFFFF")
TITLE_FONT = Font(name="Yu Gothic", bold=True, size=14)
CELL_FONT = Font(name="Yu Gothic", size=10)
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)
CENTER_ALIGN = Alignment(horizontal="center", vertical="center")


def generate_excel(timecard_list: list[TimecardData]) -> io.BytesIO:
    """タイムカードデータをExcelファイルに変換する"""
    wb = Workbook()
    wb.remove(wb.active)  # デフォルトシートを削除

    for idx, timecard in enumerate(timecard_list):
        sheet_name = timecard.employee_name or f"タイムカード{idx + 1}"
        # シート名の制限（31文字以内、禁止文字除去）
        for ch in ["\\", "/", "*", "?", ":", "[", "]"]:
            sheet_name = sheet_name.replace(ch, "")
        sheet_name = sheet_name[:31]

        ws = wb.create_sheet(title=sheet_name)
        _write_timecard_sheet(ws, timecard)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def _write_timecard_sheet(ws, timecard: TimecardData) -> None:
    """1つのタイムカードデータをシートに書き込む"""
    # 列幅設定
    column_widths = {
        "A": 8,   # 日付
        "B": 8,   # 曜日
        "C": 12,  # 出勤
        "D": 12,  # 退勤
        "E": 12,  # 休憩
        "F": 12,  # 勤務時間
        "G": 12,  # 残業
        "H": 20,  # 備考
    }
    for col, width in column_widths.items():
        ws.column_dimensions[col].width = width

    # タイトル行
    title = f"勤怠表  {timecard.year}年{timecard.month}月"
    ws.merge_cells("A1:H1")
    cell = ws["A1"]
    cell.value = title
    cell.font = TITLE_FONT
    cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    # 従業員名
    ws.merge_cells("A2:H2")
    cell = ws["A2"]
    cell.value = f"氏名: {timecard.employee_name}"
    cell.font = Font(name="Yu Gothic", size=11)
    cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 24

    # ヘッダー行
    headers = ["日付", "曜日", "出勤", "退勤", "休憩", "勤務時間", "残業", "備考"]
    header_row = 4
    ws.row_dimensions[header_row].height = 22

    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col_idx, value=header)
        cell.font = HEADER_FONT_WHITE
        cell.fill = HEADER_FILL
        cell.border = THIN_BORDER
        cell.alignment = CENTER_ALIGN

    # データ行
    for row_idx, record in enumerate(timecard.records, header_row + 1):
        values = [
            record.date,
            record.day_of_week,
            record.clock_in,
            record.clock_out,
            record.break_time,
            record.working_hours,
            record.overtime,
            record.remarks,
        ]
        for col_idx, value in enumerate(values, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = CELL_FONT
            cell.border = THIN_BORDER
            cell.alignment = CENTER_ALIGN

        # 土日の色分け
        if record.day_of_week == "土":
            for col_idx in range(1, 9):
                ws.cell(row=row_idx, column=col_idx).fill = PatternFill(
                    start_color="DAEEF3", end_color="DAEEF3", fill_type="solid"
                )
        elif record.day_of_week == "日":
            for col_idx in range(1, 9):
                ws.cell(row=row_idx, column=col_idx).fill = PatternFill(
                    start_color="F2DCDB", end_color="F2DCDB", fill_type="solid"
                )

    # 合計行
    total_row = header_row + len(timecard.records) + 1
    ws.cell(row=total_row, column=1, value="合計").font = HEADER_FONT
    ws.cell(row=total_row, column=1).border = THIN_BORDER
    ws.cell(row=total_row, column=1).alignment = CENTER_ALIGN
    ws.merge_cells(
        start_row=total_row, start_column=1, end_row=total_row, end_column=2
    )

    # 合計セルにスタイル適用
    for col_idx in range(3, 9):
        cell = ws.cell(row=total_row, column=col_idx)
        cell.border = THIN_BORDER
        cell.alignment = CENTER_ALIGN
        cell.font = HEADER_FONT

    # 勤務時間と残業の合計をSUM式で設定
    data_start = header_row + 1
    data_end = total_row - 1
    if data_start <= data_end:
        # 勤務日数（出勤が入っている日数をカウント）
        col_c = get_column_letter(3)
        ws.cell(row=total_row, column=3).value = (
            f'=COUNTA({col_c}{data_start}:{col_c}{data_end})'
        )
