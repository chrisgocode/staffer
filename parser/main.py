import os
import re
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from bs4 import BeautifulSoup
import requests
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

load_dotenv()

CONVEX_URL = os.getenv("CONVEX_URL")
CONVEX_API_KEY = os.getenv("CONVEX_API_KEY")
CALENDAR_URL = "https://www.bu.edu/reg/calendars/"


def parse_date(date_str: str, year: int) -> Optional[str]:
    """Convert date string like 'October 13' to ISO format 'YYYY-MM-DD'"""
    try:
        date_obj = datetime.strptime(f"{date_str} {year}", "%B %d %Y")
        return date_obj.strftime("%Y-%m-%d")
    except Exception as e:
        logger.debug(f"Failed to parse date '{date_str}' with year {year}: {e}")
        return None


def extract_year_range(header_text: str) -> Optional[tuple[int, int]]:
    """Extract year range from header like '2026-2027' -> (2026, 2027)"""
    match = re.search(r'(\d{4})-(\d{4})', header_text)
    if match:
        return (int(match.group(1)), int(match.group(2)))
    return None


def extract_semester_from_row(row_text: str) -> Optional[tuple[str, int]]:
    """Extract semester and year from row like 'Fall 2026' -> ('Fall', 2026)"""
    match = re.search(r'(Fall|Spring|Summer)\s+(\d{4})', row_text, re.IGNORECASE)
    if match:
        semester = match.group(1).capitalize()
        year = int(match.group(2))
        return (semester, year)
    return None


def save_semester(
    semesters: List[Dict],
    current_semester: Optional[str],
    current_year: Optional[int],
    semester_start_date: Optional[str],
    semester_end_date: Optional[str],
) -> None:
    """Save a completed semester to the semesters list if we have valid data."""
    if current_semester and current_year and semester_start_date and semester_end_date:
        semester_name = f"{current_semester} {current_year}"
        # Check if this semester already exists (avoid duplicates)
        if not any(s['semester'] == semester_name for s in semesters):
            semesters.append({
                'semester': semester_name,
                'startDate': semester_start_date,
                'endDate': semester_end_date,
            })
            logger.info(f"Found semester: {semester_name} ({semester_start_date} to {semester_end_date})")


def scrape_calendar() -> Tuple[List[Dict], List[Dict]]:
    """Scrape BU academic calendar and extract holidays and semester dates"""
    logger.info(f"Fetching calendar from {CALENDAR_URL}")
    response = requests.get(CALENDAR_URL, timeout=30)
    response.raise_for_status()
    logger.info(f"Successfully fetched calendar page (status: {response.status_code})")
    
    soup = BeautifulSoup(response.content, 'html.parser')
    holidays = []
    semesters = []
    tables = soup.find_all('table')
    logger.info(f"Found {len(tables)} tables to parse")
    
    for table in tables:
        prev_headers = table.find_all_previous(['h2', 'h3', 'h4'])
        year_range = None
        
        for header in prev_headers[:5]:
            text = header.get_text().strip()
            year_range = extract_year_range(text)
            if year_range:
                break
        
        if not year_range or year_range[0] < 2025:
            continue
        
        logger.info(f"Processing table with year range {year_range[0]}-{year_range[1]}")
        rows = table.find_all('tr')
        
        current_semester = None
        current_year = None
        current_date = None
        semester_start_date = None
        semester_end_date = None
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            
            # Check if this is a semester header row (th with colspan)
            if len(cells) == 1:
                th_cell = cells[0]
                if th_cell.name == 'th' and th_cell.get('colspan'):
                    semester_text = th_cell.get_text().strip()
                    semester_info = extract_semester_from_row(semester_text)
                    if semester_info:
                        # Save previous semester before starting new one
                        save_semester(semesters, current_semester, current_year, 
                                     semester_start_date, semester_end_date)
                        
                        current_semester, current_year = semester_info
                        semester_start_date = None
                        semester_end_date = None
                        continue
            
            if len(cells) < 2:
                continue
            
            date_cell = cells[0].get_text().strip()
            desc_cell = cells[1].get_text().strip()
            
            semester_info = extract_semester_from_row(date_cell)
            if semester_info:
                # Save previous semester before starting new one
                save_semester(semesters, current_semester, current_year, 
                             semester_start_date, semester_end_date)
                
                current_semester, current_year = semester_info
                semester_start_date = None
                semester_end_date = None
                continue
            
            if date_cell and re.match(r'^[A-Za-z]+\s+\d+', date_cell):
                if not current_year:
                    current_year = year_range[0]
                parsed_date = parse_date(date_cell, current_year)
                if parsed_date is not None:
                    current_date = parsed_date
                else:
                    logger.warning(f"Failed to parse date '{date_cell}' with year {current_year}, skipping")
            
            # Check for semester start ("Classes Begin")
            if 'Classes Begin' in desc_cell and current_date and not semester_start_date:
                semester_start_date = current_date
                logger.info(f"Found semester start: {current_date} for {current_semester} {current_year}")
            
            # Check for semester end ("Last Day of Classes")
            if 'Last Day of Classes' in desc_cell and current_date:
                semester_end_date = current_date
                logger.info(f"Found semester end: {current_date} for {current_semester} {current_year}")
            
            is_holiday = 'Holiday' in desc_cell and 'Classes Suspended' in desc_cell
            
            if is_holiday and current_date:
                date_obj = datetime.strptime(current_date, "%Y-%m-%d")
                is_monday = date_obj.weekday() == 0
                holiday_name = desc_cell.split(',', 1)[0].strip()
                
                holidays.append({
                    'date': current_date,
                    'name': holiday_name,
                    'semester': f"{current_semester} {current_year}" if current_semester else None,
                    'isMonday': is_monday,
                })
                logger.info(f"Found holiday: {current_date} - {holiday_name} ({'Monday' if is_monday else 'Other'})")
            
            is_substitution = (
                'Substitute a Monday schedule' in desc_cell or 
                'Substitute Monday Schedule' in desc_cell or
                'Substitute Monday' in desc_cell or
                ('substitute' in desc_cell.lower() and 'monday' in desc_cell.lower())
            )
            
            if is_substitution and current_date:
                holidays.append({
                    'date': current_date,
                    'name': 'Monday Schedule (Substituted)',
                    'semester': f"{current_semester} {current_year}" if current_semester else None,
                    'isMonday': False,
                    'isSubstitution': True,
                })
                logger.info(f"Found Monday substitution: {current_date}")
        
        # Save last semester in table
        save_semester(semesters, current_semester, current_year, 
                     semester_start_date, semester_end_date)
    
    logger.info(f"Scraping complete - found {len(holidays)} holidays and {len(semesters)} semesters")
    return holidays, semesters


def upload_holidays_to_convex(holidays: List[Dict]) -> None:
    """Upload holidays to Convex via HTTP endpoint"""
    if not CONVEX_URL:
        logger.error("CONVEX_URL not set in environment")
        raise ValueError("CONVEX_URL not set in environment")
    
    if not CONVEX_API_KEY:
        logger.error("CONVEX_API_KEY not set in environment")
        raise ValueError("CONVEX_API_KEY not set in environment")
    
    endpoint = f"{CONVEX_URL}/calendar/uploadHolidays"
    logger.info(f"Uploading {len(holidays)} holidays to {endpoint}")
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {CONVEX_API_KEY}'
        }
        response = requests.post(
            endpoint,
            json={'holidays': holidays},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        logger.info(f"Successfully uploaded {len(holidays)} holidays (status: {response.status_code})")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to upload holidays: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        raise


def upload_semesters_to_convex(semesters: List[Dict]) -> None:
    """Upload semesters to Convex via HTTP endpoint"""
    if not CONVEX_URL:
        logger.error("CONVEX_URL not set in environment")
        raise ValueError("CONVEX_URL not set in environment")
    
    if not CONVEX_API_KEY:
        logger.error("CONVEX_API_KEY not set in environment")
        raise ValueError("CONVEX_API_KEY not set in environment")
    
    endpoint = f"{CONVEX_URL}/calendar/uploadSemesters"
    logger.info(f"Uploading {len(semesters)} semesters to {endpoint}")
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {CONVEX_API_KEY}'
        }
        response = requests.post(
            endpoint,
            json={'semesters': semesters},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        logger.info(f"Successfully uploaded {len(semesters)} semesters (status: {response.status_code})")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to upload semesters: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response status: {e.response.status_code}")
            logger.error(f"Response body: {e.response.text}")
        raise


def main():
    logger.info("Starting calendar scraper")
    try:
        holidays, semesters = scrape_calendar()
        
        logger.info(f"Found {len(holidays)} holidays and {len(semesters)} semesters")
        
        if semesters:
            logger.info("Semesters:")
            for semester in semesters:
                logger.info(f"  - {semester['semester']}: {semester['startDate']} to {semester['endDate']}")
        else:
            logger.warning("No semesters found")
        
        if holidays:
            logger.info("Holidays:")
            for holiday in holidays:
                logger.info(f"  - {holiday['date']}: {holiday['name']} ({holiday['semester']})")
        else:
            logger.warning("No holidays found")
        
        if semesters:
            upload_semesters_to_convex(semesters)
            logger.info("Semesters upload complete!")
        
        if holidays:
            upload_holidays_to_convex(holidays)
            logger.info("Holidays upload complete!")
            
    except Exception as e:
        logger.error(f"Error during scraping: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
