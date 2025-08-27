"""
Desktop Application Automation Examples

Demonstrates ProcessIQ's desktop automation capabilities for:
- Native application control (Windows/macOS/Linux)
- Office automation (Excel, Word, etc.)
- System administration tasks
- Multi-application workflows
- Screen monitoring and interaction
"""

import asyncio
from datetime import datetime
from pathlib import Path

from processiq.connectors.desktop import DesktopConnector, DesktopConnectorConfig, InteractionMode, DesktopPlatform
from processiq.core.events import EventBus


async def office_automation_example():
    """
    Example: Automate Microsoft Office applications
    """
    
    print("📊 Office Automation Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    # Configure for Office automation
    config = DesktopConnectorConfig(
        name="office_automation",
        description="Automate Office applications",
        interaction_mode=InteractionMode.HYBRID,
        auto_launch_apps={
            "Excel": "excel.exe",
            "Word": "winword.exe"
        },
        screenshot_on_action=True,
        confirm_destructive_actions=False
    )
    
    connector = DesktopConnector(config, event_bus)
    
    try:
        print("🚀 Connecting to desktop...")
        await connector.connect()
        
        # Excel automation workflow
        excel_workflow = {
            "name": "excel_data_processing",
            "target_app": "Excel",
            "actions": [
                {
                    "type": "launch_app",
                    "target": "Excel",
                    "value": "excel.exe"
                },
                {
                    "type": "wait",
                    "value": "3"  # Wait for app to load
                },
                {
                    "type": "key",
                    "value": "ctrl+n"  # New workbook
                },
                {
                    "type": "type",
                    "value": "Product Sales Data",
                    "target": "A1"
                },
                {
                    "type": "key",
                    "value": "tab"  # Move to B1
                },
                {
                    "type": "type",
                    "value": "Revenue"
                },
                {
                    "type": "key",
                    "value": "enter"  # Move to A2
                },
                {
                    "type": "type",
                    "value": "Product A\nProduct B\nProduct C"
                },
                {
                    "type": "click",
                    "target": "B2"
                },
                {
                    "type": "type",
                    "value": "15000\n25000\n35000"
                },
                {
                    "type": "key",
                    "value": "ctrl+s"  # Save
                }
            ]
        }
        
        print("📊 Automating Excel...")
        records = await connector.fetch_data({"workflow": excel_workflow}, limit=10)
        
        print(f"✅ Excel automation completed: {len(records)} actions executed")
        for record in records[:3]:  # Show first 3 actions
            print(f"  • {record.data.get('success', 'Unknown')} - {record.metadata.get('action_type', 'Unknown')}")
    
    except Exception as e:
        print(f"❌ Office automation error: {e}")
    
    finally:
        await connector.disconnect()
        print("🛑 Office automation completed")


async def system_administration_example():
    """
    Example: System administration tasks
    """
    
    print("\n🔧 System Administration Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    config = DesktopConnectorConfig(
        name="system_admin",
        description="System administration automation",
        interaction_mode=InteractionMode.HYBRID,
        monitor_target_processes=["explorer.exe", "chrome.exe", "notepad.exe"],
        record_session=True
    )
    
    connector = DesktopConnector(config, event_bus)
    
    try:
        print("🚀 Starting system administration...")
        await connector.connect()
        
        # System tasks workflow
        admin_workflow = {
            "name": "system_maintenance",
            "actions": [
                {
                    "type": "key",
                    "value": "win+r"  # Open Run dialog
                },
                {
                    "type": "wait",
                    "value": "1"
                },
                {
                    "type": "type",
                    "value": "taskmgr"  # Task Manager
                },
                {
                    "type": "key",
                    "value": "enter"
                },
                {
                    "type": "wait",
                    "value": "3"
                },
                {
                    "type": "screenshot",
                    "target": "task_manager_screenshot"
                },
                {
                    "type": "key",
                    "value": "alt+f4"  # Close Task Manager
                },
                {
                    "type": "key",
                    "value": "win+x"  # Power user menu
                },
                {
                    "type": "wait",
                    "value": "1"
                },
                {
                    "type": "key",
                    "value": "escape"  # Close menu
                }
            ]
        }
        
        print("🔧 Executing system administration tasks...")
        records = await connector.fetch_data({"workflow": admin_workflow})
        
        print(f"✅ System tasks completed: {len(records)} operations")
        
        # Monitor system processes
        print("\n📊 Monitoring system processes...")
        process_count = 0
        async for record in connector.fetch_data_stream({"type": "processes", "interval": 2}):
            process_count += 1
            if record.data.get('name') in ['explorer.exe', 'chrome.exe']:
                print(f"  • {record.data.get('name')} - PID: {record.data.get('pid')} - CPU: {record.data.get('cpu_percent', 0):.1f}%")
            
            if process_count >= 10:  # Limit for demo
                break
    
    except Exception as e:
        print(f"❌ System administration error: {e}")
    
    finally:
        await connector.disconnect()


async def multi_application_workflow_example():
    """
    Example: Multi-application workflow combining different desktop apps
    """
    
    print("\n🔄 Multi-Application Workflow Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    config = DesktopConnectorConfig(
        name="multi_app_workflow",
        description="Coordinate multiple desktop applications",
        interaction_mode=InteractionMode.HYBRID,
        auto_launch_apps={
            "Notepad": "notepad.exe",
            "Calculator": "calc.exe"
        },
        screenshot_on_action=True,
        default_delay=0.5
    )
    
    connector = DesktopConnector(config, event_bus)
    
    try:
        print("🚀 Starting multi-application workflow...")
        await connector.connect()
        
        # Multi-app workflow: Notepad -> Calculator -> File Explorer
        workflow = {
            "name": "productivity_workflow",
            "actions": [
                # Step 1: Open Notepad and create a document
                {
                    "type": "launch_app",
                    "target": "Notepad",
                    "value": "notepad.exe"
                },
                {
                    "type": "wait",
                    "value": "2"
                },
                {
                    "type": "type",
                    "value": "ProcessIQ Desktop Automation Demo\n\nTasks completed:\n1. Opened Notepad\n2. Created document\n"
                },
                
                # Step 2: Open Calculator for some calculations
                {
                    "type": "launch_app",
                    "target": "Calculator",
                    "value": "calc.exe"
                },
                {
                    "type": "wait",
                    "value": "2"
                },
                {
                    "type": "click",
                    "target": "Calculator button 5"
                },
                {
                    "type": "click",
                    "target": "Calculator button +"
                },
                {
                    "type": "click",
                    "target": "Calculator button 3"
                },
                {
                    "type": "click",
                    "target": "Calculator button ="
                },
                {
                    "type": "screenshot",
                    "target": "calculator_result"
                },
                
                # Step 3: Switch back to Notepad and add results
                {
                    "type": "window_action",
                    "target": "Untitled - Notepad",
                    "value": "activate"
                },
                {
                    "type": "key",
                    "value": "ctrl+end"  # Go to end of document
                },
                {
                    "type": "type",
                    "value": "3. Performed calculation: 5 + 3 = 8\n4. Switched between applications\n"
                },
                
                # Step 4: Save and organize
                {
                    "type": "key",
                    "value": "ctrl+s"
                },
                {
                    "type": "wait",
                    "value": "2"
                },
                {
                    "type": "type",
                    "value": "ProcessIQ_Demo.txt"
                },
                {
                    "type": "key",
                    "value": "enter"
                }
            ]
        }
        
        print("🔄 Executing multi-application workflow...")
        records = await connector.fetch_data({"workflow": workflow})
        
        print(f"✅ Multi-app workflow completed: {len(records)} steps")
        
        # Show workflow summary
        successful_actions = [r for r in records if r.data.get("success", False)]
        print(f"📊 Success rate: {len(successful_actions)}/{len(records)} ({len(successful_actions)/len(records)*100:.1f}%)")
        
    except Exception as e:
        print(f"❌ Multi-application workflow error: {e}")
    
    finally:
        await connector.disconnect()


async def ai_powered_desktop_automation_example():
    """
    Example: AI-powered desktop automation using vision understanding
    """
    
    print("\n🤖 AI-Powered Desktop Automation Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    config = DesktopConnectorConfig(
        name="ai_desktop_automation",
        description="AI-powered desktop interaction",
        interaction_mode=InteractionMode.AI_VISION,
        ai_provider="qwen2.5-vl",
        vision_confidence_threshold=0.8,
        ai_context_screenshots=True
    )
    
    connector = DesktopConnector(config, event_bus)
    
    try:
        print("🚀 Starting AI-powered desktop automation...")
        await connector.connect()
        
        # AI-driven workflow using natural language descriptions
        ai_workflow = {
            "name": "ai_desktop_interaction",
            "actions": [
                {
                    "type": "screenshot",
                    "target": "desktop_state_before"
                },
                {
                    "type": "click",
                    "target": "start menu button on taskbar"  # Natural language
                },
                {
                    "type": "wait",
                    "value": "2"
                },
                {
                    "type": "type",
                    "target": "search field in start menu",
                    "value": "calculator"
                },
                {
                    "type": "click",
                    "target": "calculator app in search results"
                },
                {
                    "type": "wait",
                    "value": "3"
                },
                {
                    "type": "click",
                    "target": "number 1 button in calculator"
                },
                {
                    "type": "click",
                    "target": "plus button in calculator"
                },
                {
                    "type": "click",
                    "target": "number 2 button in calculator"
                },
                {
                    "type": "click",
                    "target": "equals button in calculator"
                },
                {
                    "type": "screenshot",
                    "target": "calculator_with_result"
                }
            ]
        }
        
        print("🤖 Using AI vision to interact with desktop...")
        print("⚠️ Note: This requires Vision LLM setup (placeholder in demo)")
        
        # In actual implementation with Vision LLM:
        # records = await connector.fetch_data({"workflow": ai_workflow})
        
        # Demo mode - simulate AI interaction
        demo_records = [
            {
                "id": "ai_demo_1",
                "data": {"success": True, "method": "ai_vision", "confidence": 0.95},
                "metadata": {"action_type": "ai_click", "description": "Found start menu button"}
            },
            {
                "id": "ai_demo_2", 
                "data": {"success": True, "method": "ai_vision", "confidence": 0.87},
                "metadata": {"action_type": "ai_type", "description": "Located search field"}
            }
        ]
        
        print("✅ AI desktop automation completed (demo mode)")
        print(f"📊 Simulated {len(demo_records)} AI-powered interactions")
        for record in demo_records:
            confidence = record["data"].get("confidence", 0)
            action = record["metadata"].get("action_type", "unknown")
            description = record["metadata"].get("description", "")
            print(f"  • {action}: {description} (confidence: {confidence:.2f})")
    
    except Exception as e:
        print(f"❌ AI desktop automation error: {e}")
    
    finally:
        await connector.disconnect()


async def desktop_monitoring_example():
    """
    Example: Monitor desktop applications and system state
    """
    
    print("\n📊 Desktop Monitoring Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    config = DesktopConnectorConfig(
        name="desktop_monitor",
        description="Monitor desktop applications and system",
        monitor_target_processes=["chrome.exe", "code.exe", "explorer.exe"],
        record_session=False
    )
    
    connector = DesktopConnector(config, event_bus)
    
    try:
        print("🚀 Starting desktop monitoring...")
        await connector.connect()
        
        print("📊 Monitoring active windows...")
        window_count = 0
        async for record in connector.fetch_data_stream({"type": "windows", "interval": 3}):
            window_count += 1
            window_title = record.data.get("title", "Unknown")
            is_active = record.data.get("is_active", False)
            status = "🟢 Active" if is_active else "⚪ Inactive"
            
            print(f"  {status} Window: {window_title[:50]}...")
            
            if window_count >= 5:  # Limit for demo
                break
        
        print(f"\n📊 System resource monitoring...")
        
        # Get system schema/capabilities
        schema = await connector.get_schema()
        print(f"Platform: {schema.get('platform', 'Unknown')}")
        print(f"Active windows: {schema.get('active_windows', 0)}")
        print(f"Running processes: {schema.get('running_processes', 0)}")
        print(f"Capabilities: {list(schema.get('capabilities', {}).keys())}")
        
    except Exception as e:
        print(f"❌ Desktop monitoring error: {e}")
    
    finally:
        await connector.disconnect()


async def main():
    """Run all desktop automation examples"""
    
    print("🖥️ ProcessIQ Desktop Automation Examples")
    print("=" * 70)
    print("These examples demonstrate comprehensive desktop application control:\n")
    
    try:
        await office_automation_example()
        await system_administration_example()
        await multi_application_workflow_example()
        await ai_powered_desktop_automation_example()
        await desktop_monitoring_example()
        
        print("\n" + "=" * 70)
        print("✅ All desktop automation examples completed!")
        print("\nDesktop Automation Capabilities:")
        print("• 📊 Office Applications (Excel, Word, PowerPoint)")
        print("• 🔧 System Administration (Task Manager, Control Panel)")
        print("• 🔄 Multi-Application Workflows")
        print("• 🤖 AI-Powered Visual Interaction")
        print("• 📊 Real-time Desktop Monitoring")
        print("• 🖱️ Mouse & Keyboard Automation")
        print("• 🪟 Window Management")
        print("• 📸 Screen Capture & Recording")
        print("• 🔍 Element Detection (Image + AI)")
        print("• 💾 Process Management")
        
        print("\nNext Steps:")
        print("1. Install desktop automation dependencies:")
        print("   pip install pyautogui pygetwindow psutil pillow opencv-python")
        print("2. Configure AI providers for vision-based automation")
        print("3. Create custom desktop workflows for your specific applications")
        print("4. Set up scheduled desktop automation tasks")
        print("5. Integrate with the ProcessIQ desktop application")
    
    except Exception as e:
        print(f"\n❌ Desktop automation examples failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())