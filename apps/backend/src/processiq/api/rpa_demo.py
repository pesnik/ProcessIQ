"""
RPA Demo API endpoints for interactive demonstration
"""
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import time

router = APIRouter()

# In-memory storage for demo executions
active_executions: Dict[str, Dict[str, Any]] = {}

class RPAExecutionRequest(BaseModel):
    workflowType: str = "kaggle_to_excel"
    steps: List[str]
    options: Optional[Dict[str, Any]] = None

class RPAStepResult(BaseModel):
    stepId: str
    status: str  # 'success', 'error', 'running'
    data: Optional[Dict[str, Any]] = None
    duration: Optional[int] = None
    error: Optional[str] = None
    screenshot: Optional[str] = None

class RPAExecutionResponse(BaseModel):
    executionId: str
    status: str  # 'started', 'running', 'completed', 'failed'
    currentStep: Optional[str] = None
    results: Optional[List[RPAStepResult]] = None
    artifacts: Optional[Dict[str, Any]] = None

@router.post("/execute", response_model=RPAExecutionResponse)
async def start_rpa_demo(request: RPAExecutionRequest):
    """Start RPA demo execution"""
    execution_id = str(uuid.uuid4())
    
    # Initialize execution state
    active_executions[execution_id] = {
        "id": execution_id,
        "status": "started",
        "steps": request.steps,
        "options": request.options or {},
        "current_step": None,
        "results": [],
        "artifacts": {},
        "start_time": datetime.now(),
        "logs": []
    }
    
    # Start background execution
    asyncio.create_task(execute_demo_workflow(execution_id, request))
    
    return RPAExecutionResponse(
        executionId=execution_id,
        status="started",
        results=[]
    )

@router.post("/execute/{execution_id}/stop")
async def stop_rpa_demo(execution_id: str):
    """Stop RPA demo execution"""
    if execution_id not in active_executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    execution = active_executions[execution_id]
    execution["status"] = "stopped"
    execution["current_step"] = None
    
    return {"message": "Execution stopped", "executionId": execution_id}

@router.get("/execute/{execution_id}/status", response_model=RPAExecutionResponse)
async def get_demo_status(execution_id: str):
    """Get current status of RPA demo execution"""
    if execution_id not in active_executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    execution = active_executions[execution_id]
    
    return RPAExecutionResponse(
        executionId=execution_id,
        status=execution["status"],
        currentStep=execution.get("current_step"),
        results=[RPAStepResult(**result) for result in execution["results"]],
        artifacts=execution.get("artifacts", {})
    )

@router.get("/execute/{execution_id}/stream")
async def stream_demo_progress(execution_id: str):
    """Stream real-time progress updates for RPA demo execution"""
    if execution_id not in active_executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    async def event_generator():
        last_update = 0
        
        while execution_id in active_executions:
            execution = active_executions[execution_id]
            
            # Check if there are new updates
            current_update = len(execution["results"]) + (1 if execution.get("current_step") else 0)
            
            if current_update > last_update or execution["status"] in ["completed", "failed"]:
                response = RPAExecutionResponse(
                    executionId=execution_id,
                    status=execution["status"],
                    currentStep=execution.get("current_step"),
                    results=[RPAStepResult(**result) for result in execution["results"]],
                    artifacts=execution.get("artifacts", {})
                )
                
                yield f"data: {response.model_dump_json()}\n\n"
                last_update = current_update
                
                # Immediately close stream after sending final event
                if execution["status"] in ["completed", "failed", "stopped"]:
                    return  # This properly closes the generator/stream
            
            await asyncio.sleep(0.5)  # Update every 500ms
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        }
    )

@router.get("/artifacts")
async def get_available_artifacts():
    """Get list of available artifacts from recent demo runs"""
    # Mock artifact list for demo purposes
    artifacts = [
        "sales_analysis_20250828_123456.xlsx",
        "demo_summary_20250828_123456.json",
        "screenshot_step1.png",
        "screenshot_step2.png"
    ]
    return {"artifacts": artifacts}

@router.get("/artifacts/{filename}")
async def download_artifact(filename: str):
    """Download a specific artifact file"""
    # For demo purposes, return mock file content
    if filename.endswith('.json'):
        mock_content = {
            "demo_id": "demo_20250828_123456",
            "execution_time": datetime.now().isoformat(),
            "success": True,
            "steps_completed": 4,
            "total_execution_time_ms": 3450,
            "artifacts_generated": ["excel_file", "screenshots"]
        }
        content = json.dumps(mock_content, indent=2).encode()
        media_type = "application/json"
    elif filename.endswith('.xlsx'):
        # Return a small mock Excel file (just headers for demo)
        content = b"Mock Excel content - would be actual XLSX binary data"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif filename.endswith('.png'):
        # Return a small mock PNG (just headers for demo)
        content = b"Mock PNG content - would be actual PNG binary data"
        media_type = "image/png"
    else:
        raise HTTPException(status_code=404, detail="File not found")
    
    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

async def execute_demo_workflow(execution_id: str, request: RPAExecutionRequest):
    """Background task to execute the demo workflow"""
    if execution_id not in active_executions:
        return
        
    execution = active_executions[execution_id]
    execution["status"] = "running"
    
    # Get execution options
    options = request.options or {}
    headless_mode = options.get("headless", True)
    show_browser = options.get("showBrowser", False)
    
    # Determine if we should run browser in visible mode
    use_visible_browser = show_browser or not headless_mode
    
    try:
        for i, step_id in enumerate(request.steps):
            if execution["status"] == "stopped":
                break
                
            # Set current step
            execution["current_step"] = step_id
            
            # Execute step based on type
            start_time = time.time()
            
            if step_id == "web_scraping" and use_visible_browser:
                # Real browser automation for web scraping when in visible mode
                step_result = await execute_browser_step(step_id, not use_visible_browser)
            else:
                # Simulate other steps or headless execution
                await asyncio.sleep(1 + (i * 0.5))  # Varying execution times
                step_result = {
                    "stepId": step_id,
                    "status": "success",
                    "duration": int((time.time() - start_time) * 1000),
                    "data": get_mock_step_data(step_id)
                }
            
            end_time = time.time()
            if "duration" not in step_result:
                step_result["duration"] = int((end_time - start_time) * 1000)
            
            if execution["status"] == "stopped":
                break
            
            execution["results"].append(step_result)
            execution["current_step"] = None
        
        # Mark as completed
        execution["status"] = "completed"
        execution["end_time"] = datetime.now()  # Track completion time
        execution["artifacts"] = {
            "excel_file": f"sales_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
            "summary_report": f"demo_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            "screenshots": [f"screenshot_step{i+1}.png" for i in range(len(request.steps))]
        }
        
        
    except Exception as e:
        execution["status"] = "failed"
        execution["end_time"] = datetime.now()  # Track failure time
        execution["error"] = str(e)


async def execute_browser_step(step_id: str, headless: bool = False) -> Dict[str, Any]:
    """Execute real browser automation step using Playwright"""
    start_time = time.time()
    
    try:
        # Try to import playwright
        from playwright.async_api import async_playwright
        import os
        
        # Check if we're in WSL2/headless environment
        is_wsl = os.path.exists('/proc/version') and 'WSL' in open('/proc/version').read()
        is_ssh = 'SSH_CLIENT' in os.environ or 'SSH_TTY' in os.environ
        is_macos = os.uname().sysname == 'Darwin'
        has_display = 'DISPLAY' in os.environ
        has_wslg = is_wsl and has_display and os.environ.get('DISPLAY') == ':0'
        
        # Force headless mode only if no display available or SSH (but allow WSLg and macOS)
        effective_headless = headless or is_ssh or (not is_macos and not has_display and not has_wslg)
        
        async with async_playwright() as p:
            # Launch browser with appropriate mode
            browser_args = ['--no-sandbox']
            if effective_headless:
                browser_args.extend([
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--no-first-run',
                    '--disable-default-apps'
                ])
            
            browser = await p.chromium.launch(
                headless=effective_headless,
                slow_mo=500 if not effective_headless else 0,  # Slow down for visibility
                args=browser_args
            )
            
            # Create a new page
            page = await browser.new_page()
            
            # Navigate to a demo site (using httpbin for safe demo)
            await page.goto('https://httpbin.org/forms/post')
            
            # Wait a bit for user to see the page (only in visible mode)
            if not effective_headless:
                await asyncio.sleep(2)
            
            # Fill out a form as demonstration
            await page.fill('input[name="custname"]', 'ProcessIQ Demo User')
            await page.fill('input[name="custtel"]', '555-0123')
            await page.fill('input[name="custemail"]', 'demo@processiq.com')
            
            if not effective_headless:
                await asyncio.sleep(2)  # Let user see the form filling
            
            # Take a screenshot
            screenshot_path = f"/tmp/demo_screenshot_{int(time.time())}.png"
            await page.screenshot(path=screenshot_path)
            
            # Get some data from the page
            title = await page.title()
            url = page.url
            
            await browser.close()
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            return {
                "stepId": step_id,
                "status": "success",
                "duration": duration_ms,
                "data": {
                    "page_title": title,
                    "url_visited": url,
                    "form_filled": True,
                    "screenshot_taken": True,
                    "browser_mode": "visible" if not effective_headless else "headless",
                    "automation_tool": "Playwright",
                    "environment": "WSL2+WSLg" if has_wslg else ("WSL2" if is_wsl else ("macOS" if is_macos else "Linux")),
                    "display_available": has_display,
                    "wslg_support": has_wslg,
                    "requested_mode": "visible" if not headless else "headless",
                    "actual_mode": "visible" if not effective_headless else "headless",
                    "records_scraped": 1,
                    "data_quality": "100%",
                    "file_size": "2.3 KB"
                },
                "screenshot": screenshot_path
            }
            
    except ImportError:
        # Fallback to mock if Playwright not available
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "stepId": step_id,
            "status": "success", 
            "duration": duration_ms,
            "data": {
                **get_mock_step_data(step_id),
                "browser_mode": "visible" if not headless else "headless",
                "note": "Playwright not available - using mock data"
            }
        }
        
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "stepId": step_id,
            "status": "error",
            "duration": duration_ms,
            "error": f"Browser automation failed: {str(e)}",
            "data": {"browser_mode": "visible" if not headless else "headless"}
        }

def get_mock_step_data(step_id: str) -> Dict[str, Any]:
    """Generate mock data for each step"""
    import random
    
    if step_id == "web_scraping":
        return {
            "records_scraped": random.randint(100, 200),
            "sources": ["mock-kaggle-dataset.com"],
            "data_quality": f"{random.uniform(95, 99):.1f}%",
            "file_size": f"{random.uniform(10, 20):.1f} KB"
        }
    elif step_id == "data_processing":
        return {
            "records_processed": random.randint(140, 190),
            "records_cleaned": random.randint(135, 185),
            "duplicates_removed": random.randint(1, 5),
            "total_sales": f"${random.uniform(500000, 1000000):,.2f}",
            "regions_analyzed": 5
        }
    elif step_id == "excel_generation":
        return {
            "worksheets_created": 4,
            "charts_generated": random.randint(4, 8),
            "file_size": f"{random.uniform(2, 4):.1f} MB",
            "format": "XLSX with macros"
        }
    elif step_id == "analysis_report":
        return {
            "insights_generated": random.randint(8, 15),
            "trends_identified": random.randint(3, 7),
            "recommendations": random.randint(5, 10),
            "confidence_score": f"{random.uniform(85, 95):.1f}%"
        }
    else:
        return {"status": "completed"}