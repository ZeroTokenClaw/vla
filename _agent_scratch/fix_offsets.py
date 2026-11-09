def mark(t, spans):
    for s, typ in spans:
        i = t.index(s)
        print(f"  {{ id: '', text: '{s}', type: '{typ}', start: {i}, end: {i + len(s)} }},")


print("ELEMENT")
t = "货主王敏于2026年11月03日投诉：运单 DL-WH-99021 在苏州吴中仓滞留，要求改派昆山市陆家镇前进路 66 号，联系电话 139****2208。仓管已确认库位 A-12-03。"
mark(
    t,
    [
        ("王敏", "PERSON"),
        ("2026年11月03日", "DATE"),
        ("DL-WH-99021", "WAYBILL"),
        ("苏州吴中仓", "WAREHOUSE"),
        ("昆山市陆家镇前进路 66 号", "ADDRESS"),
        ("139****2208", "PHONE"),
        ("A-12-03", "BIN_LOC"),
    ],
)

print("ANTD")
t2 = "Operator Lim reported at 2026-11-02 14:18 that Cell ORN-CELL-SG07 stopped: Part SKU-AX-441 jammed in fixture F-2. Site Singapore Bay. Escalate to L2."
mark(
    t2,
    [
        ("Lim", "OPERATOR"),
        ("2026-11-02 14:18", "TIMESTAMP"),
        ("ORN-CELL-SG07", "CELL_ID"),
        ("SKU-AX-441", "PART_SKU"),
        ("F-2", "FIXTURE"),
        ("Singapore Bay", "SITE"),
    ],
)

print("NAIVE")
t3 = "任务日记：灵眸于 2026-11-05 09:12 执行「把蓝色马克杯放到托盘」。对象 mug-blue，位置 island-left，结果 SUCCESS。指令号 LM-ACT-441。"
mark(
    t3,
    [
        ("灵眸", "AGENT"),
        ("2026-11-05 09:12", "TIMESTAMP"),
        ("把蓝色马克杯放到托盘", "ACTION"),
        ("mug-blue", "OBJECT"),
        ("island-left", "LOC"),
        ("SUCCESS", "STATUS"),
        ("LM-ACT-441", "ACT_ID"),
    ],
)

print("ARCO")
t4 = "租户 tn-sc-02 巡检告警：站点 SC-GATE-北门 于 2026-11-06 21:40 触发 ALERT-INTRUSION，关联资产 CAM-12B，值班员周凯已签收。"
mark(
    t4,
    [
        ("tn-sc-02", "TENANT"),
        ("SC-GATE-北门", "SITE"),
        ("2026-11-06 21:40", "TIMESTAMP"),
        ("ALERT-INTRUSION", "ALERT"),
        ("CAM-12B", "ASSET"),
        ("周凯", "OPERATOR"),
    ],
)
