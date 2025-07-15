# Troubleshooting Guide

This guide helps you resolve common issues with Where Now Explorer. Most problems can be solved quickly with the solutions below.

## Quick Fixes

Before diving into specific issues, try these general solutions:

1. **Refresh the page** (Ctrl+R or Cmd+R)
2. **Check your internet connection**
3. **Ensure location permissions are granted**
4. **Try in a different browser**
5. **Clear browser cache and cookies**

---

## Location Issues

### "Location Not Available" or "Location Access Denied"

**Possible Causes:**

- Location permissions not granted
- Browser blocking location access
- Device location services disabled
- Using HTTP instead of HTTPS

**Solutions:**

1. **Grant Location Permission:**
   - Look for location permission prompt in browser
   - Click "Allow" when prompted
   - If no prompt appears, check browser address bar for location icon

2. **Check Browser Settings:**
   - **Chrome:** Settings → Privacy and Security → Site Settings → Location
   - **Firefox:** Address bar → Shield icon → Permissions → Location
   - **Safari:** Safari → Preferences → Websites → Location
   - **Edge:** Settings → Cookies and Site Permissions → Location

3. **Enable Device Location Services:**
   - **Windows:** Settings → Privacy → Location
   - **macOS:** System Preferences → Security & Privacy → Location Services
   - **iOS:** Settings → Privacy & Security → Location Services
   - **Android:** Settings → Location → App-level permissions

4. **Ensure HTTPS Connection:**
   - Check that URL starts with `https://`
   - Location services require secure connection
   - If using HTTP, browsers will block location access

### Inaccurate or Outdated Location

**Symptoms:**

- Location shows wrong city or area
- Position hasn't updated despite moving
- Large margin of error in position

**Solutions:**

1. **Wait for GPS Fix:**
   - Initial location may be network-based (less accurate)
   - GPS can take 30-60 seconds to provide accurate position
   - Stay outdoors for better GPS signal

2. **Check Location Source:**
   - GPS: Most accurate (5-10m)
   - WiFi/Network: Moderate accuracy (50-500m)
   - Cell Tower: Least accurate (500m-several km)

3. **Improve GPS Signal:**
   - Move outdoors or near windows
   - Away from tall buildings or underground areas
   - Ensure GPS is enabled in device settings

4. **Refresh Location:**
   - Disable and re-enable location permission
   - Close and reopen browser tab
   - Restart browser entirely

### Location Updates Too Slowly

**Solutions:**

1. **Check Update Frequency:**
   - App updates location every 30 seconds automatically
   - Manual refresh available by reloading page

2. **Verify Movement:**
   - App may not update for very small movements
   - Move at least 10-20 meters for noticeable updates

3. **Browser Performance:**
   - Close unnecessary tabs
   - Disable browser extensions temporarily
   - Restart browser if sluggish

---

## Search and Destination Issues

### "No Results Found" for Search

**Common Causes:**

- Spelling errors
- Too vague or too specific search terms
- No internet connection
- Service temporarily unavailable

**Solutions:**

1. **Improve Search Terms:**

   ```
   Instead of: "park"
   Try: "Central Park New York"

   Instead of: "123 Main St"
   Try: "123 Main Street, Sydney NSW"

   Instead of: "McDonald's"
   Try: "McDonald's Times Square"
   ```

2. **Try Alternative Names:**
   - Official name vs. common name
   - Local language vs. English
   - Full address vs. shortened version

3. **Check Internet Connection:**
   - Search requires active internet connection
   - Test by visiting another website
   - Try mobile data if WiFi is problematic

### Wrong Location in Search Results

**Solutions:**

1. **Be More Specific:**
   - Include city, state, or country
   - Add landmark or area references
   - Use complete addresses when possible

2. **Check Full Address:**
   - Read complete address in search results
   - Look for country/region indicators
   - Verify before selecting result

3. **Use Map Context:**
   - Consider your current location
   - Nearby results usually appear first
   - Look for distance indicators

### Search Suggestions Not Appearing

**Solutions:**

1. **Type More Characters:**
   - Need at least 3 characters for suggestions
   - Add more detail for better results

2. **Check Connection Speed:**
   - Slow connections may delay suggestions
   - Wait a moment for results to load

3. **Browser Issues:**
   - Clear browser cache
   - Disable ad blockers temporarily
   - Try different browser

---

## Distance and Calculation Issues

### Distance Not Updating

**Solutions:**

1. **Verify Active Movement:**
   - Distance only updates when you actually move
   - Need to move significant distance (10+ meters)

2. **Check Location Services:**
   - Ensure location permission still granted
   - Some browsers require permission per session

3. **Destination Still Set:**
   - Verify destination hasn't been cleared
   - Set destination again if needed

### Inaccurate Distance Calculations

**Understanding Distance Types:**

- **Straight-line distance:** Direct distance "as the crow flies"
- **Not actual travel distance:** Doesn't account for roads, terrain
- **Updates in real-time:** Changes as you move

**Solutions:**

1. **Verify Coordinates:**
   - Ensure both current location and destination are accurate
   - Try setting destination again

2. **Unit Confusion:**
   - Check if displaying kilometers vs miles
   - App uses metric system by default

### Progress Not Showing Correctly

**Solutions:**

1. **Check Starting Point:**
   - Progress calculated from when destination was set
   - May need to set destination again if you've moved significantly

2. **Verify Destination:**
   - Ensure correct destination is still selected
   - Distance calculation requires both points

---

## Performance Issues

### App Loading Slowly

**Solutions:**

1. **Check Connection Speed:**
   - Test internet speed
   - Try different network (WiFi vs mobile data)

2. **Browser Performance:**
   - Close unnecessary tabs
   - Clear browser cache
   - Restart browser

3. **Device Resources:**
   - Close other apps
   - Restart device if needed
   - Free up device storage space

### App Freezing or Unresponsive

**Solutions:**

1. **Force Refresh:**
   - Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Or close tab and reopen

2. **Browser Issues:**
   - Try different browser
   - Update browser to latest version
   - Disable browser extensions

3. **Device Issues:**
   - Restart device
   - Check available memory
   - Close background apps

### High Battery Usage

**Solutions:**

1. **Optimize Settings:**
   - Reduce screen brightness
   - Close unused apps
   - Use WiFi instead of mobile data when possible

2. **Location Services:**
   - GPS usage can drain battery
   - Consider using power saving mode
   - Connect to charger for long trips

---

## Browser-Specific Issues

### Safari (iOS/macOS)

**Common Issues:**

- Location permission resets frequently
- Cross-site tracking prevention interferes

**Solutions:**

- Re-grant location permission each session if needed
- Check Safari → Preferences → Privacy settings
- Ensure "Prevent Cross-Site Tracking" allows location services

### Chrome (All Platforms)

**Common Issues:**

- Site permissions need explicit management
- Extensions may interfere

**Solutions:**

- Check Chrome → Settings → Privacy and Security → Site Settings
- Disable extensions temporarily
- Try incognito mode for testing

### Firefox

**Common Issues:**

- Enhanced tracking protection may block features
- Permission management differs from other browsers

**Solutions:**

- Check address bar shield icon for blocked content
- Temporarily disable Enhanced Tracking Protection
- Review Firefox → Preferences → Privacy & Security

### Edge

**Common Issues:**

- Similar to Chrome but with Microsoft account integration
- SmartScreen may block some features

**Solutions:**

- Check Edge → Settings → Cookies and Site Permissions
- Ensure SmartScreen isn't blocking content
- Try InPrivate browsing for testing

---

## Mobile Device Issues

### iOS Safari Issues

**Common Problems:**

- Location permission prompts every session
- App doesn't save to home screen properly

**Solutions:**

- This is normal iOS behavior for web apps
- Grant permission each time you use the app
- For home screen: Share → Add to Home Screen

### Android Chrome Issues

**Common Problems:**

- Background location access limitations
- Battery optimization affecting performance

**Solutions:**

- Keep app/browser active for best performance
- Disable battery optimization for browser
- Ensure location permission is set to "Allow all the time"

### PWA Installation Issues

**If "Install App" doesn't appear:**

- Use app several times to trigger install prompt
- Check browser supports PWA installation
- Try different browser (Chrome works best)

**If installed app doesn't work properly:**

- Uninstall and reinstall PWA
- Clear browser data before reinstalling
- Use browser version instead

---

## Privacy and Security Issues

### Location Sharing Concerns

**Solutions:**

- Review browser location permissions regularly
- Use private/incognito browsing for additional privacy
- Clear browser data after use if concerned
- Remember: location data stays on your device

### HTTPS Certificate Warnings

**If you see security warnings:**

- Don't proceed if you see SSL/TLS certificate errors
- Use official app URL only
- Contact your network administrator if on corporate network

---

## Advanced Troubleshooting

### Developer Tools Debugging

If you're comfortable with browser developer tools:

1. **Open Developer Tools:** F12 or Ctrl+Shift+I
2. **Check Console:** Look for error messages
3. **Check Network Tab:** Verify API requests are successful
4. **Check Application Tab:** Review local storage and permissions

### Error Codes

**Common Error Patterns:**

- `PERMISSION_DENIED`: Location access denied
- `POSITION_UNAVAILABLE`: GPS/location service unavailable
- `TIMEOUT`: Location request took too long
- `NETWORK_ERROR`: Internet connection issues

### When to Contact Support

Contact support if:

- Issues persist after trying all solutions
- Error messages appear that aren't covered here
- App behavior is completely unexpected
- Security concerns arise

---

## Prevention Tips

### Regular Maintenance

1. **Keep Browser Updated:** Ensures compatibility and security
2. **Review Permissions Regularly:** Check what sites have location access
3. **Clear Cache Periodically:** Prevents storage issues
4. **Monitor Data Usage:** Keep track of mobile data consumption

### Best Practices

1. **Test Before Important Trips:** Ensure everything works before you need it
2. **Have Backup Navigation:** Don't rely solely on one app
3. **Check Battery Levels:** Ensure device is charged for longer trips
4. **Save Important Locations:** Bookmark frequently used destinations

### Optimal Usage Conditions

- Strong GPS signal (outdoors, clear sky view)
- Stable internet connection
- Updated browser
- Sufficient device battery
- Location permissions granted

---

## Still Need Help?

If this guide doesn't solve your issue:

1. **Check the User Guide** for general usage questions
2. **Review Browser Documentation** for browser-specific settings
3. **Test in Different Browser** to isolate browser-specific issues
4. **Try Different Device** to determine if issue is device-specific

Most issues can be resolved by ensuring proper permissions, stable internet connection, and using a supported browser with location services enabled.
