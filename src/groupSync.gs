const CONFIG = {
  GROUP_EMAIL: 'allemployees@domain.com',

  // Filters: User must match one Location AND one Grade
  VALID_LOCATIONS: ['Mumbai', 'MUMBAI-', 'Mumbai- ', 'Mumbai - '],
  VALID_GRADES: [
    'Grade E2', 'Band B', 'Grade I', 
    'Sample II', 'Retainer/Consultant'
  ],

  MAX_RUN_TIME_MINS: 4.5 
};

/**
 * Main function to start the sync. 
 * Set this to run on a daily trigger.
 */
function runSyncManager() {
  const startTime = new Date().getTime();
  
  // Step 1: Add eligible users
  const additionsDone = syncActiveUsers(startTime);

  if (additionsDone) {
    // Step 2: Remove suspended users (only after additions are finished)
    const cleanupDone = cleanupSuspendedMembers(startTime);
    
    if (cleanupDone) {
      console.log("Sync complete. All records updated.");
      PropertiesService.getScriptProperties().deleteAllProperties(); 
    } else {
      resumeLater();
    }
  } else {
    resumeLater();
  }
}

function syncActiveUsers(startTime) {
  const props = PropertiesService.getScriptProperties();
  let pageToken = props.getProperty('NEXT_PAGE_TOKEN');
  
  if (props.getProperty('MODE') === 'CLEANUP') return true;

  do {
    if (isTimeUp(startTime)) {
      props.setProperty('NEXT_PAGE_TOKEN', pageToken);
      return false;
    }

    const response = AdminDirectory.Users.list({
      customer: 'my_customer',
      maxResults: 200,
      pageToken: pageToken,
      query: "isSuspended=false",
      projection: 'full'
    });

    if (response.users) {
      response.users.forEach(user => {
        const userLoc = getUserLocation(user);
        const userGrade = getUserGrade(user);

        const isMumbai = CONFIG.VALID_LOCATIONS.some(loc => userLoc.includes(loc));
        const isValidGrade = CONFIG.VALID_GRADES.includes(userGrade);

        if (isMumbai && isValidGrade) {
          try {
            AdminDirectory.Members.insert({ email: user.primaryEmail, role: 'MEMBER' }, CONFIG.GROUP_EMAIL);
            console.log("Added: " + user.primaryEmail);
          } catch (e) { /* Skip if already in group */ }
        }
      });
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  props.setProperty('MODE', 'CLEANUP');
  return true;
}

function cleanupSuspendedMembers(startTime) {
  const props = PropertiesService.getScriptProperties();
  let pageToken = props.getProperty('CLEANUP_TOKEN');

  do {
    if (isTimeUp(startTime)) {
      props.setProperty('CLEANUP_TOKEN', pageToken);
      return false;
    }

    const response = AdminDirectory.Members.list(CONFIG.GROUP_EMAIL, {
      maxResults: 200,
      pageToken: pageToken
    });

    if (response.members) {
      response.members.forEach(member => {
        try {
          const user = AdminDirectory.Users.get(member.email);
          if (user.suspended) {
            AdminDirectory.Members.remove(CONFIG.GROUP_EMAIL, member.email);
            console.log("Removed suspended user: " + member.email);
          }
        } catch (e) { /* User might be deleted */ }
      });
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return true;
}

// Helpers
function getUserLocation(user) {
  try {
    const workAddr = user.addresses.find(a => a.type === 'work') || user.addresses[0];
    return workAddr.formatted || '';
  } catch (e) { return ''; }
}

function getUserGrade(user) {
  try {
    return user.customSchemas.Additional_Information.Grade || '';
  } catch (e) { return ''; }
}

function isTimeUp(start) {
  return ((new Date().getTime() - start) / 60000) >= CONFIG.MAX_RUN_TIME_MINS;
}

function resumeLater() {
  ScriptApp.newTrigger('runSyncManager').timeBased().after(60000).create();
  console.log("Time limit reached. Script will resume in 1 minute.");
}
