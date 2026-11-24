# v1.1 step B: replace every em dash (and two en dashes) in visible text, code strings and data names.
import sys, re, pathlib
t=pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
m=re.search(r'<script id="calcdata" type="application/json">(.*?)</script>',t,re.S)
pre, data, post = t[:m.start(1)], m.group(1), t[m.end(1):]
# data: "Huntsville — RUS locality portion" -> "Huntsville (RUS locality portion)"
data2, n = re.subn(r' \\u2014 (\w+) locality portion"', r' (\1 locality portion)"', data)
assert n==111 and '\\u2014' not in data2, n
c, p, k = 'c','p','k'   # comma, period (+capitalize), colon
ops = {1:p,2:c,3:p,4:p,5:k,6:p,7:c,8:c,9:p,10:k,11:c,12:c,13:c,14:k,15:k,16:c,17:p,18:p,19:p,20:k,21:p,22:c,23:k,24:c,25:p,
 26:('–','-'),27:c,28:c,29:c,30:c,31:c,32:c,33:c,34:("' — '+D.localityPct[t].toFixed(2)+'%'","' ('+D.localityPct[t].toFixed(2)+'%)'"),
 35:p,36:k,37:c,38:p,39:p,40:c,41:p,42:c,43:c,44:c,45:k,46:c,47:c,48:c,49:c,50:c,51:c,52:c,53:k,54:p,55:c,56:p,57:p,58:c,59:c,60:c,61:c,62:c,63:c,
 64:k,65:c,66:c,67:c,68:c,69:k,70:k,71:k,72:('<td>—</td>','<td>$0</td>'),73:k,74:k,75:k,76:p,77:c,78:p,79:k,80:k,81:k,82:p,83:c,84:c,85:c,86:c,87:p,88:c,89:c,
 90:('— <span','None <span'),91:('<td>—<span','<td>None<span'),92:c,93:c,94:c,95:c,96:('–',' to '),97:c,98:('<td>— <span','<td>None <span'),
 99:k,100:c,101:p,102:c,103:c,104:c,105:p,106:p,107:c,108:c,109:(' — ',' ('),110:(' — ',') '),111:c,112:c,113:c,114:p,115:c,116:p,117:p,118:p,
 119:(' — ',', and '),120:p,121:k,122:c,123:c,124:c,125:k,126:p,127:p,128:p,129:c,
 130:(" \\u2014 ", ": "),131:(" \\u2014 ", ": "),132:(" \\u2014 ", ": "),133:("' — '","' for '")}
def patch(s, base):
    out=[]; last=0; n=base
    for x in re.finditer('—|\\\\u2014|–', s):
        n+=1; op=ops[n]; a,b=x.start(),x.end()
        if isinstance(op,tuple):
            old,new=op
            # the snippet must sit around this dash
            lo=s.rfind(old, max(last,a-len(old)), b+len(old)); assert lo!=-1 and lo<=a<lo+len(old), (n,s[a-30:b+30])
            out.append(s[last:lo]); out.append(new); last=lo+len(old)
        else:
            assert s[a-1]==' ' and s[b]==' ', (n,s[a-30:b+30])
            out.append(s[last:a-1])
            if op==c: out.append(', '); last=b+1
            elif op==k: out.append(': '); last=b+1
            else:
                nxt=s[b+1]; out.append('. '+(nxt.upper() if nxt.islower() else nxt)); last=b+2
    out.append(s[last:]); return ''.join(out), n
pre2, n1 = patch(pre, 0)
post2, n2 = patch(post, n1)
assert n2==133, n2
res = pre2 + data2 + post2
for bad in ('—','\\u2014','–'): assert bad not in res, bad
pathlib.Path(sys.argv[2]).write_text(res,encoding='utf-8')
print('dashes replaced:',n2,'in text and code,',n,'in wage area names')
