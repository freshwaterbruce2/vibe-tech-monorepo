# Test Radio Streams Before Deploy

**IMPORTANT:** Test ALL these URLs in VLC before deploying to phone!

## How to Test

### Option 1: VLC Desktop

1. Open VLC Media Player
2. Media → Open Network Stream (Ctrl+N)
3. Paste URL below
4. Click Play
5. ✅ Works = Use it | ❌ Doesn't work = Skip it

### Option 2: Browser

1. Paste URL in Firefox or Chrome address bar
2. Press Enter
3. Should start playing immediately

## Stations to Test

### Christian Radio

**K-Love (AAC+ format - may not work in Android WebView)**

```
http://maestro.emfcdn.com/stream_for/k-love/web/aac
```

⚠️ **WARNING:** AAC+ format - Android WebView might not support this!

**WALM HD (MP3 320kbps - HIGH QUALITY)**

```
https://icecast.walmradio.com:8443/walm
```

✅ **RECOMMENDED:** MP3 format, high quality

**Christmas Vinyl HD (MP3 320kbps)**

```
https://icecast.walmradio.com:8443/christmas
```

### Anime / J-Pop

**R/a/dio (MP3)**

```
https://relay0.r-a-d.io/main.mp3
```

**Gensokyo Radio (MP3 256kbps)**

```
https://stream.gensokyoradio.net/3/
```

**Vocaloid Radio (MP3 320kbps)**

```
https://vocaloid.radioca.st/stream
```

**stereoanime (MP3 128kbps)**

```
https://radio.stereoanime.net/listen/stereoanime/128
```

### Classical Music

**Classic FM UK (MP3 128kbps)**

```
http://ice-the.musicradio.com/ClassicFMMP3
```

**Your Classical - Relax (MP3 128kbps)**

```
http://relax.stream.publicradio.org/relax.mp3
```

**Rai Radio 3 (MP3 320kbps)**

```
http://icestreaming.rai.it/3.mp3
```

### Chill/Study Music

**SomaFM - Groove Salad (MP3 128kbps)**

```
http://ice1.somafm.com/groovesalad-128-mp3
```

**SomaFM - Drone Zone (MP3 128kbps)**

```
http://ice1.somafm.com/dronezone-128-mp3
```

## Testing Checklist

Test each URL and mark results:

- [ ] K-Love AAC+ - Works in VLC? ____
- [ ] WALM HD - Works in VLC? ____
- [ ] Christmas Vinyl HD - Works in VLC? ____
- [ ] R/a/dio - Works in VLC? ____
- [ ] Gensokyo Radio - Works in VLC? ____
- [ ] Vocaloid Radio - Works in VLC? ____
- [ ] stereoanime - Works in VLC? ____
- [ ] Classic FM UK - Works in VLC? ____
- [ ] Your Classical - Relax - Works in VLC? ____
- [ ] Rai Radio 3 - Works in VLC? ____
- [ ] SomaFM Groove Salad - Works in VLC? ____
- [ ] SomaFM Drone Zone - Works in VLC? ____

## K-Love Problem

**Issue:** K-Love uses AAC+ format, NOT MP3

- AAC+ may not work in Android WebView
- Alternative: Use WALM HD (Christian music, MP3, higher quality)
- Or: We can add K-Love but it might say "format not supported"

## Next Steps

1. ✅ Test all URLs above in VLC
2. ✅ Tell me which ones work
3. ✅ I'll create new station list with ONLY working URLs
4. ✅ Deploy to phone
5. ✅ Test on phone

---

**DO NOT SKIP TESTING!** We've wasted too much time deploying broken streams. Test in VLC first!
