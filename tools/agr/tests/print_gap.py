# gap between the end of the Three Paths box and the "Read This First" footer on printed page 1, in points (negative = overlap)
import sys, re, subprocess
def gap(f):
    x=subprocess.run(['pdftotext','-f','1','-l','1','-bbox',f,'-'],capture_output=True,text=True).stdout
    words=[(float(m.group(2)),float(m.group(4)),m.group(5)) for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>',x)]
    foot=[w for i,w in enumerate(words) if w[2].startswith('First') and words[i-1][2]=='This' and words[i-2][2]=='Read']
    body=[w for w in words if w[2]=='math.']
    if not foot or not body: return None
    return round(foot[-1][0]-body[-1][1],1)
if __name__=='__main__':
    for f in sys.argv[1:]: print(f.split('/')[-1].ljust(20),'gap',gap(f),'pt')
