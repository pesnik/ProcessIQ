"""
Basic Web Automation Example

Demonstrates how to use ProcessIQ's hybrid web connector
to automate data collection from websites using both
traditional and AI-powered approaches.
"""

import asyncio
from processiq import ProcessEngine
from processiq.connectors.web import WebConnector, WebConnectorConfig, WebAutomationMode
from processiq.core.events import EventBus
from processiq.core.config import get_settings


async def basic_web_scraping_example():
    """
    Example: Basic web scraping with traditional selectors
    """
    
    print("🌐 Basic Web Scraping Example")
    print("=" * 50)
    
    # Initialize event bus
    event_bus = EventBus()
    
    # Configure web connector for traditional automation
    config = WebConnectorConfig(
        name="basic_web_scraper",
        description="Basic web scraping example",
        automation_mode=WebAutomationMode.TRADITIONAL,
        headless=True,
        browser_type="chromium"
    )
    
    # Create web connector
    connector = WebConnector(config, event_bus)
    
    try:
        # Connect to browser
        print("🚀 Starting browser...")
        await connector.connect()
        
        # Define scraping query
        query = {
            "workflow": {
                "name": "scrape_quotes",
                "description": "Scrape quotes from quotes.toscrape.com",
                "start_url": "http://quotes.toscrape.com",
                "actions": [
                    {
                        "type": "wait",
                        "target": ".quote",
                        "timeout": 10000
                    }
                ],
                "extraction_rules": {
                    "quotes": ".quote .text",
                    "authors": ".quote .author",
                    "tags": ".quote .tags a"
                }
            }
        }
        
        # Fetch data
        print("📥 Extracting data...")
        records = await connector.fetch_data(query, limit=5)
        
        # Display results
        print(f"✅ Extracted {len(records)} records:")
        for i, record in enumerate(records[:3]):  # Show first 3
            print(f"\n📝 Record {i+1}:")
            for key, value in record.data.items():
                print(f"  {key}: {value}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        # Cleanup
        await connector.disconnect()
        print("🛑 Browser closed")


async def ai_powered_automation_example():
    """
    Example: AI-powered web automation using Vision LLM
    """
    
    print("\n🤖 AI-Powered Automation Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    # Configure for AI-powered automation
    config = WebConnectorConfig(
        name="ai_web_automation",
        description="AI-powered web automation example",
        automation_mode=WebAutomationMode.VISION_AI,
        ai_provider="qwen2.5-vl",
        vision_model_size="7B",
        headless=False,  # Show browser for demo
        browser_type="chromium"
    )
    
    connector = WebConnector(config, event_bus)
    
    try:
        print("🚀 Starting browser with AI capabilities...")
        await connector.connect()
        
        # AI-powered interaction query
        query = {
            "workflow": {
                "name": "ai_form_filling",
                "description": "Fill a form using AI vision",
                "start_url": "http://httpbin.org/forms/post",
                "actions": [
                    {
                        "type": "type",
                        "target": "fill the customer name field",  # Natural language
                        "value": "John Doe"
                    },
                    {
                        "type": "type", 
                        "target": "fill the email field",
                        "value": "john@example.com"
                    },
                    {
                        "type": "click",
                        "target": "submit button"  # AI will identify the button
                    }
                ],
                "extraction_rules": {
                    "form_data": "form input",
                    "response": "body"
                }
            }
        }
        
        print("🤖 Using AI to interact with webpage...")
        print("⚠️ Note: This requires Vision LLM setup (not implemented in demo)")
        
        # This would work with actual Vision LLM integration
        # records = await connector.fetch_data(query)
        
        print("✅ AI automation completed (demo mode)")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await connector.disconnect()
        print("🛑 Browser closed")


async def hybrid_automation_example():
    """
    Example: Hybrid automation with intelligent fallback
    """
    
    print("\n🔄 Hybrid Automation Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    # Configure for hybrid automation
    config = WebConnectorConfig(
        name="hybrid_automation",
        description="Hybrid automation with fallback",
        automation_mode=WebAutomationMode.HYBRID,
        prefer_traditional=True,
        vision_fallback=True,
        headless=True
    )
    
    connector = WebConnector(config, event_bus)
    
    try:
        print("🚀 Starting hybrid automation...")
        await connector.connect()
        
        # Query that might fail with traditional methods
        query = {
            "workflow": {
                "name": "robust_extraction",
                "description": "Extract data with fallback mechanisms",
                "start_url": "https://example.com",
                "actions": [
                    {
                        "type": "click",
                        "target": "#dynamic-button",  # Might not exist
                    }
                ],
                "extraction_rules": {
                    "title": "h1, .title, .heading",  # Multiple selectors
                    "content": "p, .content, .description"
                }
            }
        }
        
        print("⚡ Trying traditional automation first...")
        print("🤖 Falling back to AI if needed...")
        
        records = await connector.fetch_data(query, limit=1)
        
        print(f"✅ Hybrid automation completed: {len(records)} records")
        if records:
            print(f"📄 Sample data: {records[0].data}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await connector.disconnect()
        print("🛑 Automation completed")


async def monitoring_and_events_example():
    """
    Example: Monitor automation events and performance
    """
    
    print("\n📊 Monitoring and Events Example")
    print("=" * 50)
    
    event_bus = EventBus()
    
    # Event handlers for monitoring
    def on_connector_status_changed(event):
        print(f"📡 Connector status: {event.data['new_status']}")
    
    def on_connector_error(event):
        print(f"❌ Connector error: {event.data['error']}")
    
    # Subscribe to events
    event_bus.subscribe("connector.status_changed", on_connector_status_changed)
    event_bus.subscribe("connector.error", on_connector_error)
    
    config = WebConnectorConfig(
        name="monitored_automation",
        description="Automation with monitoring",
        automation_mode=WebAutomationMode.TRADITIONAL,
        headless=True
    )
    
    connector = WebConnector(config, event_bus)
    
    try:
        print("🔍 Starting monitored automation...")
        await connector.connect()
        
        # Simple query
        query = {
            "url": "https://httpbin.org/json"
        }
        
        records = await connector.fetch_data(query)
        print(f"✅ Monitoring completed: {len(records)} records processed")
        
        # Show recent events
        recent_events = event_bus.get_recent_events(5)
        print(f"\n📋 Recent events ({len(recent_events)}):")
        for event in recent_events:
            print(f"  • {event.name}: {event.timestamp}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await connector.disconnect()


async def main():
    """Run all examples"""
    
    print("🚀 ProcessIQ Web Automation Examples")
    print("=" * 60)
    print("These examples demonstrate different automation approaches:\n")
    
    # Run examples
    try:
        await basic_web_scraping_example()
        await ai_powered_automation_example()
        await hybrid_automation_example()
        await monitoring_and_events_example()
        
        print("\n" + "=" * 60)
        print("✅ All examples completed!")
        print("\nNext steps:")
        print("1. Configure your AI providers (OpenAI, Anthropic, or local Qwen2.5-VL)")
        print("2. Create custom connectors for your specific use cases")
        print("3. Build workflows combining multiple data sources")
        print("4. Set up the desktop application for visual workflow design")
    
    except Exception as e:
        print(f"\n❌ Example execution failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())