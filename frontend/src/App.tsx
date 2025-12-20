import { useState } from 'react'
import React from 'react'
import './style.css'

type ClassEntry = {
  id: string
  course: string
  section: string
  type: string
  days: string
  time: string
  building: string
  room: string
  instructor: string
  available: string
}

type ScheduledClass = ClassEntry & {
  startHour: number
  endHour: number
  dayIndices: number[]
}

const initialClasses: ClassEntry[] = [
  {
    id: '1',
    course: 'CSE 8A',
    section: 'A00',
    type: 'LE',
    days: 'TuTh',
    time: '8:00a-9:20a',
    building: 'PETER',
    room: '110',
    instructor: 'Smith, John',
    available: '15/50',
  },
  {
    id: '2',
    course: 'CSE 8A',
    section: 'A01',
    type: 'DI',
    days: 'M',
    time: '10:00a-10:50a',
    building: 'SOLIS',
    room: '107',
    instructor: 'Smith, John',
    available: '8/20',
  },
  {
    id: '3',
    course: 'MATH 20A',
    section: 'A00',
    type: 'LE',
    days: 'MWF',
    time: '9:00a-9:50a',
    building: 'PETER',
    room: '105',
    instructor: 'Johnson, Mary',
    available: '22/100',
  },
  {
    id: '4',
    course: 'MATH 20A',
    section: 'A01',
    type: 'DI',
    days: 'W',
    time: '2:00p-2:50p',
    building: 'PETER',
    room: '105',
    instructor: 'Johnson, Mary',
    available: '5/30',
  },
  {
    id: '5',
    course: 'CSE 11',
    section: 'A00',
    type: 'LE',
    days: 'TuTh',
    time: '11:00a-12:20p',
    building: 'PETER',
    room: '120',
    instructor: 'Williams, David',
    available: '30/60',
  },
  {
    id: '6',
    course: 'CSE 11',
    section: 'A01',
    type: 'DI',
    days: 'F',
    time: '1:00p-1:50p',
    building: 'PETER',
    room: '120',
    instructor: 'Williams, David',
    available: '10/25',
  },
]

// Parse time string like "8:00a-9:20a" to start and end hours
function parseTime(timeStr: string): { startHour: number; endHour: number } {
  const [start, end] = timeStr.split('-')
  
  const parseTimePart = (time: string): number => {
    const isPM = time.toLowerCase().includes('p')
    const timeOnly = time.replace(/[ap]/gi, '').trim()
    const [hours, minutes = '0'] = timeOnly.split(':')
    let hour = parseInt(hours, 10)
    const min = parseInt(minutes, 10)
    
    if (isPM && hour !== 12) hour += 12
    if (!isPM && hour === 12) hour = 0
    
    return hour + min / 60
  }
  
  return {
    startHour: parseTimePart(start),
    endHour: parseTimePart(end),
  }
}

// Parse days string like "TuTh", "MWF", "M" to day indices (0=Mon, 1=Tue, etc.)
function parseDays(daysStr: string): number[] {
  const dayMap: Record<string, number> = {
    M: 0,
    Tu: 1,
    T: 1, // Sometimes just T
    W: 2,
    Th: 3,
    F: 4,
  }
  
  const days: number[] = []
  let i = 0
  
  while (i < daysStr.length) {
    if (daysStr[i] === 'T') {
      if (i + 1 < daysStr.length && daysStr[i + 1] === 'h') {
        days.push(dayMap['Th'])
        i += 2
      } else if (i + 1 < daysStr.length && daysStr[i + 1] === 'u') {
        days.push(dayMap['Tu'])
        i += 2
      } else {
        days.push(dayMap['T'])
        i += 1
      }
    } else {
      const day = daysStr[i]
      if (dayMap[day] !== undefined) {
        days.push(dayMap[day])
      }
      i += 1
    }
  }
  
  return days.sort()
}

// Calculate grid position and span for a class block
function calculateClassPosition(
  startHour: number,
  endHour: number,
  dayIndex: number,
  minHour: number,
): { gridRow: number; gridRowSpan: number; gridColumn: number } {
  // 30-minute increments → 2 rows per hour; header rows offset by 2
  const startRow = Math.floor((startHour - minHour) * 2) + 2
  const endRow = Math.ceil((endHour - minHour) * 2) + 2
  const rowSpan = Math.max(1, endRow - startRow)
  
  return {
    gridRow: startRow,
    gridRowSpan: rowSpan,
    gridColumn: dayIndex + 2, // +2 for time column
  }
}

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

type TimeSlot = {
  label: string
  key: string
}

// Generate time slots dynamically based on scheduled classes (30-minute increments)
function generateTimeSlots(scheduledClasses: ScheduledClass[]): { slots: TimeSlot[], minHour: number } {
  // Default range: 8 AM to 8 PM
  let minHour = 8
  let maxHour = 20

  if (scheduledClasses.length > 0) {
    const allStartHours = scheduledClasses.map(cls => cls.startHour)
    const allEndHours = scheduledClasses.map(cls => cls.endHour)
    minHour = Math.floor(Math.min(...allStartHours, minHour))
    maxHour = Math.ceil(Math.max(...allEndHours, maxHour))

    // Add padding: start 1 hour earlier, end 1 hour later
    minHour = Math.max(0, minHour - 1)
    maxHour = Math.min(24, maxHour + 1)
  }

  const slots: TimeSlot[] = []
  for (let hour = minHour; hour <= maxHour; hour++) {
    for (const minute of [0, 30]) {
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      // Only show label for hour markers (minute === 0), leave 30-minute slots empty
      const label = minute === 0 ? `${displayHour}:00 ${period}` : ''

      slots.push({
        label,
        key: `${hour}-${minute}`,
      })
    }
  }

  return { slots, minHour }
}

// Generate colors for different courses
const courseColors: Record<string, string> = {}
const colorPalette = [
  '#4A90E2', // Blue
  '#50C878', // Green
  '#FF6B6B', // Red
  '#FFA500', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
  '#E74C3C', // Dark Red
  '#3498DB', // Light Blue
]

let colorIndex = 0
function getCourseColor(course: string): string {
  if (!courseColors[course]) {
    courseColors[course] = colorPalette[colorIndex % colorPalette.length]
    colorIndex++
  }
  return courseColors[course]
}

// Type definitions for API response
type ApiClass = {
  _id?: string
  name: string
  sections: {
    RestrictionCode: string
    CourseNumber: string
    SectionID: string
    MeetingType: string
    Section: string
    Days: string
    Time: string
    Location: string
    Instructor: string
    AvaliableSeats: string
    Limit: string
    searchText: string
  }[]
}

// Transform API response (Class[]) to ClassEntry[]
function transformApiDataToClassEntries(classes: ApiClass[]): ClassEntry[] {
  const classEntries: ClassEntry[] = []
  let entryId = 1

  if (!Array.isArray(classes)) {
    console.error('transformApiDataToClassEntries: Expected array but got:', typeof classes, classes)
    return []
  }

  classes.forEach((classItem, classIndex) => {
    // Check if classItem has sections
    if (!classItem.sections || !Array.isArray(classItem.sections)) {
      console.warn(`Class at index ${classIndex} has no sections array:`, classItem)
      return
    }

    if (classItem.sections.length === 0) {
      console.warn(`Class at index ${classIndex} has empty sections array:`, classItem.name)
    }

    classItem.sections.forEach((section, sectionIndex) => {
      try {
        // Parse location (format: "BUILDING ROOM" or just "TBA")
        const location = section.Location?.trim() || 'TBA'
        const locationParts = location.split(/\s+/)
        const building = locationParts.length > 0 && locationParts[0] !== '' ? locationParts[0] : 'TBA'
        const room = locationParts.length > 1 ? locationParts.slice(1).join(' ') : 'TBA'

        // Extract course code from CourseNumber (e.g., "CSE 11" or "MATH 20A")
        const course = section.CourseNumber || classItem.name.split(' ').slice(0, 2).join(' ')

        classEntries.push({
          id: `${classItem._id || classIndex}-${section.SectionID || sectionIndex}`,
          course: course || 'Unknown',
          section: section.Section || section.SectionID || 'Unknown',
          type: section.MeetingType || 'Unknown',
          days: section.Days || 'TBA',
          time: section.Time || 'TBA',
          building: building,
          room: room,
          instructor: section.Instructor || 'TBA',
          available: `${section.AvaliableSeats || '0'}/${section.Limit || '0'}`
        })
        entryId++
      } catch (err) {
        console.error(`Error transforming section ${sectionIndex} of class ${classIndex}:`, err, section)
      }
    })
  })

  return classEntries
}

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [availableClasses, setAvailableClasses] = useState<ClassEntry[]>(initialClasses)
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    // If search is empty, reset to initial classes
    if (!searchQuery.trim()) {
      setAvailableClasses(initialClasses)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = `http://localhost:3000/api/courses?search=${encodeURIComponent(searchQuery)}&term=WI26`
      console.log('Fetching from URL:', url)
      
      const response = await fetch(url)

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('API response data:', data)
      console.log('Number of classes received:', Array.isArray(data) ? data.length : 'Not an array')
      
      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', typeof data, data)
        throw new Error('Invalid response format from server')
      }
      
      // Transform API response to ClassEntry format
      const transformedClasses = transformApiDataToClassEntries(data)
      console.log('Transformed classes:', transformedClasses)
      console.log('Number of transformed entries:', transformedClasses.length)
      
      setAvailableClasses(transformedClasses)

      if (transformedClasses.length === 0) {
        setError('No courses found. Try a different search term.')
      } else {
        setError(null) // Clear any previous errors
      }
    } catch (err) {
      console.error('Error fetching courses:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to search courses. Please try again.'
      setError(errorMessage)
      setAvailableClasses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClass = (classEntry: ClassEntry) => {
    const { startHour, endHour } = parseTime(classEntry.time)
    const dayIndices = parseDays(classEntry.days)
    
    // Check for conflicts
    const hasConflict = scheduledClasses.some((scheduled) => {
      const sameDay = scheduled.dayIndices.some((day) => dayIndices.includes(day))
      if (!sameDay) return false
      
      return (
        (startHour >= scheduled.startHour && startHour < scheduled.endHour) ||
        (endHour > scheduled.startHour && endHour <= scheduled.endHour) ||
        (startHour <= scheduled.startHour && endHour >= scheduled.endHour)
      )
    })
    
    if (hasConflict) {
      alert(`Conflict detected! This class overlaps with an existing class.`)
      return
    }
    
    const scheduledClass: ScheduledClass = {
      ...classEntry,
      startHour,
      endHour,
      dayIndices,
    }
    
    setScheduledClasses([...scheduledClasses, scheduledClass])
  }

  const handleRemoveClass = (id: string) => {
    setScheduledClasses(scheduledClasses.filter((cls) => cls.id !== id))
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">TritonSchedule</h1>
      </header>

      <main className="main-content">
        {/* Search Section */}
        <section className="search-section">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for classes (e.g., CSE 8A, MATH 20A)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-button" onClick={handleSearch}>
              Search
            </button>
          </div>
        </section>

        {/* Class Results Section */}
        <section className="results-section">
          <div className="results-container">
            <h2 className="results-title">Search Results</h2>
            {isLoading && <p style={{ padding: '1rem', textAlign: 'center' }}>Loading...</p>}
            {error && <p style={{ padding: '1rem', color: 'red', textAlign: 'center' }}>{error}</p>}
            {!isLoading && !error && availableClasses.length === 0 && (
              <p style={{ padding: '1rem', textAlign: 'center' }}>No courses found. Try searching for a course.</p>
            )}
            <div className="results-table-wrapper">
              <table className="classes-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Section</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Time</th>
                    <th>Building</th>
                    <th>Room</th>
                    <th>Instructor</th>
                    <th>Available</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availableClasses.map((classEntry) => {
                    const isScheduled = scheduledClasses.some((sc) => sc.id === classEntry.id)
                    return (
                      <tr key={classEntry.id}>
                        <td>{classEntry.course}</td>
                        <td>{classEntry.section}</td>
                        <td>{classEntry.type}</td>
                        <td>{classEntry.days}</td>
                        <td>{classEntry.time}</td>
                        <td>{classEntry.building}</td>
                        <td>{classEntry.room}</td>
                        <td>{classEntry.instructor}</td>
                        <td>{classEntry.available}</td>
                        <td>
                          {isScheduled ? (
                            <button
                              className="action-btn remove-btn"
                              onClick={() => handleRemoveClass(classEntry.id)}
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              className="action-btn"
                              onClick={() => handleAddClass(classEntry)}
                            >
                              Add
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Calendar Section */}
        <section className="calendar-section">
          <div className="calendar-container">
            <h2 className="calendar-title">Weekly Schedule</h2>
            <div className="calendar-wrapper">
              {(() => {
                const { slots: timeSlots, minHour } = generateTimeSlots(scheduledClasses)
                const numRows = timeSlots.length

                return (
                  <div 
                    className="calendar-grid"
                    style={{
                      gridTemplateRows: `50px repeat(${numRows}, 30px)`
                    }}
                  >
                    {/* Time header (empty top-left cell) - explicitly positioned */}
                    <div className="time-header" style={{ gridRow: 1, gridColumn: 1 }}></div>
                    
                    {/* Day headers - explicitly positioned in row 1 */}
                    {weekdays.map((day, index) => (
                      <div 
                        key={day} 
                        className="day-header"
                        style={{ gridRow: 1, gridColumn: index + 2 }}
                      >
                        {day}
                      </div>
                    ))}

                    {/* Time slots and day cells - explicitly positioned */}
                    {timeSlots.map((slot, slotIndex) => {
                      const row = slotIndex + 2 // +2 because row 1 is header
                      return (
                        <React.Fragment key={slot.key}>
                          {/* Time slot - explicitly positioned */}
                          <div 
                            className="time-slot"
                            style={{ gridRow: row, gridColumn: 1 }}
                          >
                            {slot.label}
                          </div>
                          
                          {/* Day cells for this time slot - explicitly positioned */}
                          {weekdays.map((day, dayIndex) => (
                            <div 
                              key={`${day}-${slot.key}`} 
                              className="day-cell"
                              style={{ gridRow: row, gridColumn: dayIndex + 2 }}
                            ></div>
                          ))}
                        </React.Fragment>
                      )
                    })}

                    {/* Class blocks - rendered as direct children of calendar-grid */}
                    {scheduledClasses.map((cls) => {
                      return cls.dayIndices.map((dayIndex) => {
                        const pos = calculateClassPosition(
                          cls.startHour,
                          cls.endHour,
                          dayIndex,
                          minHour
                        )
                        return (
                          <div
                            key={`${cls.id}-${dayIndex}`}
                            className="class-block"
                            style={{
                              gridRow: `${pos.gridRow} / span ${pos.gridRowSpan}`,
                              gridColumn: pos.gridColumn,
                              backgroundColor: getCourseColor(cls.course),
                            }}
                            title={`${cls.course} ${cls.section} - ${cls.time} - ${cls.building} ${cls.room}`}
                          >
                            <div className="class-block-content">
                              <div className="class-block-title">
                                {cls.course} {cls.section}
                              </div>
                              <div className="class-block-details">
                                {cls.time} • {cls.building} {cls.room}
                              </div>
                              <div className="class-block-type">{cls.type}</div>
                            </div>
                          </div>
                        )
                      })
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
