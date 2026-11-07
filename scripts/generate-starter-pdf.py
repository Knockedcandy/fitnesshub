"""Build the static FitLifeHub starter PDF included in public/downloads."""

from pathlib import Path
import re
from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/downloads/fitlifehub-7-day-gym-starter.pdf"
FONT_DIR = Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('FLH', str(FONT_DIR / 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('FLH-Bold', str(FONT_DIR / 'DejaVuSans-Bold.ttf')))

W, H = 612, 792
NAVY = HexColor('#071225')
CARD = HexColor('#10223a')
CARD_LIGHT = HexColor('#142c44')
WHITE = HexColor('#f2f7fc')
MUTED = HexColor('#adc2d5')
CYAN = HexColor('#67e8f9')
VIOLET = HexColor('#a78bfa')
CORAL = HexColor('#fb7185')
BORDER = HexColor('#294560')


def text(c, x, y, value, size=11, color=WHITE, bold=False):
    c.setFillColor(color)
    c.setFont('FLH-Bold' if bold else 'FLH', size)
    c.drawString(x, y, value)


def panel(c, x, y, w, h, fill=CARD, radius=18):
    c.setFillColor(fill)
    c.setStrokeColor(BORDER)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def base(c, page):
    c.setFillColor(NAVY)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.rect(0, H - 6, 390, 6, fill=1, stroke=0)
    c.setFillColor(VIOLET)
    c.rect(390, H - 6, 222, 6, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.circle(46, 752, 10, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.roundRect(43, 745, 6, 14, 2, fill=1, stroke=0)
    c.roundRect(39, 749, 14, 6, 2, fill=1, stroke=0)
    text(c, 64, 748, 'FitLifeHub', 12, WHITE, True)
    c.setStrokeColor(BORDER)
    c.line(40, 51, 572, 51)
    text(c, 40, 31, 'FITLIFEHUB  /  FREE 7-DAY STARTER', 7.4, MUTED, True)
    text(c, 537, 31, f'{page:02d} / 04', 7.4, CYAN, True)


def cover_image(c, filename, x, y, w, h):
    image_path = ROOT / 'public/exercises/movements-v2' / filename
    with Image.open(image_path) as source:
        source = source.convert('RGB')
        sw, sh = source.size
        desired = w / h
        actual = sw / sh
        if actual > desired:
            crop = (sw - int(sh * desired)) // 2
            source = source.crop((crop, 0, sw - crop, sh))
        else:
            crop = (sh - int(sw / desired)) // 2
            source = source.crop((0, crop, sw, sh - crop))
        source.thumbnail((int(w * 3), int(h * 3)), Image.Resampling.LANCZOS)
        shape = c.beginPath()
        shape.roundRect(x, y, w, h, 16)
        c.saveState()
        c.clipPath(shape, stroke=0)
        c.drawImage(ImageReader(source), x, y, width=w, height=h, mask='auto')
        c.restoreState()
    c.setStrokeColor(BORDER)
    c.roundRect(x, y, w, h, 16, fill=0, stroke=1)


def section_label(c, x, y, title):
    text(c, x, y, title, 8, CYAN, True)


def day_card(c, x, y, number, title, detail, tone):
    panel(c, x, y, 126, 88, CARD_LIGHT, 13)
    c.setFillColor(tone)
    c.roundRect(x + 12, y + 58, 30, 19, 6, fill=1, stroke=0)
    text(c, x + 19, y + 64, str(number), 9, NAVY, True)
    text(c, x + 12, y + 37, title, 9.1, WHITE, True)
    text(c, x + 12, y + 17, detail, 7.5, MUTED)


def workout_row(c, y, number, name, goal, dose, cue):
    panel(c, 40, y, 532, 76, CARD, 11)
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    cover_image(c, f'{slug}.webp', 48, y + 6, 99, 64)
    text(c, 159, y + 53, name, 10.5, WHITE, True)
    text(c, 159, y + 34, goal, 8.1, CYAN)
    text(c, 159, y + 17, cue.capitalize(), 7.9, MUTED)
    c.setFillColor(CARD_LIGHT)
    c.roundRect(490, y + 26, 68, 24, 8, fill=1, stroke=0)
    text(c, 500, y + 34, dose, 8.1, CYAN, True)


def workout_page(c, page, day, title, description, exercises, recovery_day, recovery_title, recovery_lines, last=False):
    base(c, page)
    section_label(c, 40, 708, f'DAY {day}  /  TRAINING')
    text(c, 40, 670, title, 26, WHITE, True)
    text(c, 40, 646, description, 9, MUTED)
    text(c, 40, 621, 'YOUR SESSION', 9, CYAN, True)
    text(c, 457, 621, 'REST 60-90 SEC', 8, MUTED, True)
    for i, (name, goal, dose, cue) in enumerate(exercises, 1):
        workout_row(c, 531 - (i - 1) * 82, i, name, goal, dose, cue)
    panel(c, 40, 137 if last else 132, 532, 37 if last else 47, CARD_LIGHT, 11)
    text(c, 54, 160 if last else 162, f'DAY {recovery_day}  /  {recovery_title.upper()}', 9, VIOLET, True)
    text(c, 54, 145 if last else 144, recovery_lines, 7.6, MUTED)
    if last:
        panel(c, 40, 61, 532, 61, CARD, 11)
        text(c, 54, 104, 'DAY 7  /  WEEK-ONE CHECK IN', 8.5, CORAL, True)
        for x, prompt in [(54, 'Three sessions done'), (226, 'A new move learned'), (396, 'Next week planned')]:
            c.setStrokeColor(CYAN)
            c.roundRect(x, 77, 11, 11, 2, fill=0, stroke=1)
            text(c, x + 17, 79, prompt, 7.8, WHITE)
    else:
        text(c, 40, 85, 'START LIGHT. CONTROL EACH REP. STOP IF A MOVEMENT CAUSES SHARP PAIN.', 7.6, MUTED, True)
    c.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
    c.setTitle('FitLifeHub | Your 7-Day Gym Starter')
    c.setAuthor('FitLifeHub')
    base(c, 1)
    section_label(c, 40, 710, 'YOUR FREE WEEK-ONE FIELD GUIDE')
    text(c, 40, 664, 'Your first week', 30, WHITE, True)
    text(c, 40, 627, 'at the gym.', 30, CYAN, True)
    text(c, 40, 594, 'Three approachable full-body sessions.', 9.2, MUTED)
    text(c, 40, 577, 'Four days to recover, move, and build confidence.', 9.2, MUTED)
    panel(c, 330, 550, 242, 159, CARD_LIGHT, 16)
    text(c, 346, 678, 'YOUR WEEK AT A GLANCE', 8.5, CYAN, True)
    for y, label, title in [(646, '01', 'Learn the basics'), (615, '03', 'Build control'), (584, '05', 'Repeat and progress')]:
        c.setFillColor(VIOLET)
        c.roundRect(346, y - 5, 27, 20, 6, fill=1, stroke=0)
        text(c, 352, y + 1, label, 8, NAVY, True)
        text(c, 383, y + 1, title, 9.5, WHITE, True)
    section_label(c, 40, 515, 'YOUR 7-DAY MAP')
    for x, num, title, detail, tone in [
        (40, 1, 'Full body A', 'Learn the basics', CYAN),
        (176, 2, 'Easy recovery', 'Walk + reset', VIOLET),
        (312, 3, 'Full body B', 'Build control', CYAN),
        (448, 4, 'Rest', 'Eat + sleep', VIOLET),
    ]:
        day_card(c, x, 410, num, title, detail, tone)
    for x, num, title, detail, tone in [
        (40, 5, 'Full body C', 'Repeat + progress', CYAN),
        (176, 6, 'Light movement', 'Walk or stretch', VIOLET),
        (312, 7, 'Review', 'Plan next week', CORAL),
    ]:
        day_card(c, x, 312, num, title, detail, tone)
    section_label(c, 40, 279, 'HOW TO USE THIS GUIDE')
    for i, (heading, detail) in enumerate([
        ('Start easy', 'Pick a load you can control\nwith 2-3 reps left in reserve.'),
        ('Warm up', 'Move easily for 5 minutes;\npractice your first lift lightly.'),
        ('Keep it simple', 'Drink water, eat regular meals,\nand write down one win.'),
    ]):
        x = 40 + i * 181
        panel(c, x, 158, 171, 104, CARD, 13)
        text(c, x + 12, 233, f'0{i+1}', 10, CYAN, True)
        text(c, x + 12, 211, heading, 11, WHITE, True)
        for j, line in enumerate(detail.split('\n')):
            text(c, x + 12, 190 - j * 13, line, 7.5, MUTED)
    panel(c, 40, 75, 532, 67, CARD_LIGHT, 12)
    text(c, 54, 117, 'YOUR FIRST STEP', 8.4, CORAL, True)
    text(c, 54, 98, 'Save this PDF to your phone. Start Day 1 whenever you are ready.', 9.3, WHITE, True)
    text(c, 54, 83, 'General fitness guidance; ask a qualified professional about injuries or medical concerns.', 7.1, MUTED)
    c.showPage()

    workout_page(c, 2, 1, 'Full body A', 'Practice a squat, a press, a pull, and a short core hold.',
        [
            ('Goblet Squats', 'Legs + glutes', '2 × 10', 'sit between your hips'),
            ('Machine Chest Press', 'Chest + triceps', '2 × 10', 'press without bouncing'),
            ('Lat Pulldown', 'Back + biceps', '2 × 10', 'pull elbows toward ribs'),
            ('Standing Calf Raises', 'Calves', '2 × 12', 'pause at the top'),
            ('Plank', 'Core', '2 × 20s', 'breathe; keep hips level'),
        ], 2, 'Easy recovery', 'Walk 15-20 minutes. Wipe equipment and re-rack weights after use.')

    workout_page(c, 3, 3, 'Full body B', 'Control the movement. A lighter weight is a smart start.',
        [
            ('Glute Bridge', 'Glutes + hamstrings', '2 × 10', 'pause with hips lifted'),
            ('Seated Cable Row', 'Back + biceps', '2 × 10', 'keep your chest tall'),
            ('Seated Dumbbell Shoulder Press', 'Shoulders + triceps', '2 × 10', 'use a pain-free range'),
            ('Leg Curl', 'Hamstrings', '2 × 12', 'lower slowly'),
            ('Dead Bug', 'Core', '2 × 10', 'alternate sides, slow'),
        ], 4, 'Rest and refuel', 'Take a rest day. Aim for regular meals, water, and a full night of sleep.')

    workout_page(c, 4, 5, 'Full body C', 'Repeat the pattern and notice what feels more familiar.',
        [
            ('Leg Press', 'Quads + glutes', '2 × 10', 'lower under control'),
            ('Incline Dumbbell Press', 'Upper chest + triceps', '2 × 10', 'steady shoulders'),
            ('Chest Supported Row', 'Back + biceps', '2 × 10', 'lead with elbows'),
            ('Dumbbell Lateral Raises', 'Side shoulders', '2 × 12', 'raise light weights'),
            ('Reverse Lunge', 'Quads + glutes', '2 × 8', 'each leg; hold a rail if needed'),
        ], 6, 'Light movement', 'Walk 20 minutes or stretch gently. Enjoy the extra recovery.', last=True)
    c.save()
    print(OUTPUT)


if __name__ == '__main__':
    main()
