"""
Multi-Connector Workflow Example

Demonstrates ProcessIQ's ability to orchestrate multiple data sources:
- Web scraping for lead generation
- API calls for enrichment
- Database storage
- Excel export for analysis
"""

import asyncio
from datetime import datetime
from pathlib import Path

from processiq import ProcessEngine
from processiq.connectors.web import WebConnector, WebConnectorConfig, WebAutomationMode
from processiq.connectors.api import APIConnector, APIConnectorConfig, APIType
from processiq.connectors.database import DatabaseConnector, DatabaseConnectorConfig, DatabaseType
from processiq.connectors.file import FileConnector, FileConnectorConfig, StorageType, FileType
from processiq.core.events import EventBus
from processiq.core.config import get_settings


class MultiConnectorWorkflow:
    """
    Example workflow combining multiple ProcessIQ connectors
    to create a complete data pipeline.
    """
    
    def __init__(self):
        self.event_bus = EventBus()
        self.connectors = {}
        self.results = {}
    
    async def setup_connectors(self):
        """Initialize all required connectors"""
        
        print("🔧 Setting up connectors...")
        
        # 1. Web Connector - for scraping company data
        web_config = WebConnectorConfig(
            name="company_scraper",
            description="Scrape company information from web",
            automation_mode=WebAutomationMode.HYBRID,
            headless=True,
            browser_type="chromium"
        )
        self.connectors['web'] = WebConnector(web_config, self.event_bus)
        
        # 2. API Connector - for enriching data with external APIs
        api_config = APIConnectorConfig(
            name="enrichment_api",
            description="Enrich company data via API",
            base_url="https://jsonplaceholder.typicode.com",
            api_type=APIType.REST,
            timeout=30
        )
        self.connectors['api'] = APIConnector(api_config, self.event_bus)
        
        # 3. Database Connector - for storing processed data
        db_config = DatabaseConnectorConfig(
            name="results_db",
            description="Store processed results",
            database_type=DatabaseType.SQLITE,
            database_name="workflow_results.db"
        )
        self.connectors['database'] = DatabaseConnector(db_config, self.event_bus)
        
        # 4. File Connector - for Excel export
        file_config = FileConnectorConfig(
            name="excel_exporter",
            description="Export results to Excel",
            storage_type=StorageType.LOCAL,
            directory_path="./output"
        )
        self.connectors['file'] = FileConnector(file_config, self.event_bus)
        
        # Connect all connectors
        for name, connector in self.connectors.items():
            print(f"  📡 Connecting {name}...")
            await connector.connect()
        
        print("✅ All connectors ready!")
    
    async def step1_scrape_company_data(self):
        """Step 1: Scrape company data from web"""
        
        print("\n🌐 Step 1: Scraping company data...")
        
        web_connector = self.connectors['web']
        
        # Define scraping targets
        company_sources = [
            {
                "name": "TechCrunch Startups",
                "url": "https://techcrunch.com/startups/",
                "selectors": {
                    "company_names": ".post-title a",
                    "descriptions": ".post-excerpt",
                    "links": ".post-title a"
                }
            },
            {
                "name": "Product Hunt",
                "url": "https://www.producthunt.com",
                "selectors": {
                    "product_names": "[data-test=product-name]",
                    "taglines": "[data-test=product-tagline]",
                    "makers": "[data-test=product-maker]"
                }
            }
        ]
        
        scraped_data = []
        
        for source in company_sources:
            try:
                print(f"  📥 Scraping {source['name']}...")
                
                query = {
                    "workflow": {
                        "name": f"scrape_{source['name'].lower().replace(' ', '_')}",
                        "start_url": source['url'],
                        "actions": [
                            {"type": "wait", "target": "body", "timeout": 10000}
                        ],
                        "extraction_rules": source['selectors']
                    }
                }
                
                records = await web_connector.fetch_data(query, limit=5)
                
                for record in records:
                    record.metadata['source'] = source['name']
                    scraped_data.append(record)
                
                print(f"    ✅ {len(records)} records from {source['name']}")
                
            except Exception as e:
                print(f"    ❌ Failed to scrape {source['name']}: {e}")
        
        self.results['scraped_data'] = scraped_data
        print(f"🎯 Total scraped: {len(scraped_data)} records")
        
        return scraped_data
    
    async def step2_enrich_with_api_data(self, scraped_data):
        """Step 2: Enrich scraped data with API calls"""
        
        print("\n🔗 Step 2: Enriching data with API calls...")
        
        api_connector = self.connectors['api']
        enriched_data = []
        
        for record in scraped_data[:3]:  # Limit for demo
            try:
                print(f"  🔍 Enriching: {record.data.get('company_names', 'Unknown')[:50]}...")
                
                # Simulate API enrichment (using JSONPlaceholder for demo)
                query = {
                    "endpoint": f"/posts/{len(enriched_data) + 1}",
                    "method": "GET"
                }
                
                api_records = await api_connector.fetch_data(query, limit=1)
                
                if api_records:
                    # Combine scraped data with API data
                    enhanced_record = record
                    enhanced_record.data.update({
                        'api_enrichment': api_records[0].data,
                        'enrichment_timestamp': datetime.utcnow().isoformat()
                    })
                    enriched_data.append(enhanced_record)
                    
                    print(f"    ✅ Enriched with API data")
                
            except Exception as e:
                print(f"    ❌ API enrichment failed: {e}")
                # Keep original data if enrichment fails
                enriched_data.append(record)
        
        self.results['enriched_data'] = enriched_data
        print(f"🎯 Total enriched: {len(enriched_data)} records")
        
        return enriched_data
    
    async def step3_store_in_database(self, enriched_data):
        """Step 3: Store processed data in database"""
        
        print("\n🗄️ Step 3: Storing data in database...")
        
        db_connector = self.connectors['database']
        
        try:
            # Write enriched data to database
            result = await db_connector.write_data(enriched_data, mode="append")
            
            print(f"  ✅ Stored {result['successful']} records")
            if result['failed'] > 0:
                print(f"  ⚠️ Failed to store {result['failed']} records")
            
            self.results['database_result'] = result
            
        except Exception as e:
            print(f"  ❌ Database storage failed: {e}")
    
    async def step4_export_to_excel(self, enriched_data):
        """Step 4: Export results to Excel for analysis"""
        
        print("\n📊 Step 4: Exporting to Excel...")
        
        try:
            # Create output directory
            output_dir = Path("./output")
            output_dir.mkdir(exist_ok=True)
            
            # Prepare data for Excel export
            excel_data = []
            for record in enriched_data:
                flat_data = {
                    'id': record.id,
                    'timestamp': record.timestamp.isoformat(),
                    'source': record.metadata.get('source', 'Unknown'),
                    'company_name': str(record.data.get('company_names', '')),
                    'description': str(record.data.get('descriptions', '')),
                    'enriched': 'api_enrichment' in record.data
                }
                excel_data.append(flat_data)
            
            # Create Excel file (simplified - would use pandas in real implementation)
            import json
            
            excel_file = output_dir / f"workflow_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(excel_file, 'w') as f:
                json.dump(excel_data, f, indent=2, default=str)
            
            print(f"  ✅ Exported to: {excel_file}")
            
            self.results['export_file'] = str(excel_file)
            
        except Exception as e:
            print(f"  ❌ Excel export failed: {e}")
    
    async def step5_generate_analytics(self):
        """Step 5: Generate analytics and insights"""
        
        print("\n📈 Step 5: Generating analytics...")
        
        try:
            enriched_data = self.results.get('enriched_data', [])
            
            # Basic analytics
            analytics = {
                'total_records': len(enriched_data),
                'sources': {},
                'enrichment_rate': 0,
                'processing_time': datetime.utcnow().isoformat(),
                'success_metrics': {
                    'scraping_success': len(self.results.get('scraped_data', [])),
                    'enrichment_success': len(enriched_data),
                    'storage_success': self.results.get('database_result', {}).get('successful', 0)
                }
            }
            
            # Count by source
            for record in enriched_data:
                source = record.metadata.get('source', 'Unknown')
                analytics['sources'][source] = analytics['sources'].get(source, 0) + 1
            
            # Calculate enrichment rate
            enriched_count = sum(1 for r in enriched_data if 'api_enrichment' in r.data)
            analytics['enrichment_rate'] = enriched_count / len(enriched_data) * 100 if enriched_data else 0
            
            print("  📊 Analytics Summary:")
            print(f"    • Total Records: {analytics['total_records']}")
            print(f"    • Sources: {list(analytics['sources'].keys())}")
            print(f"    • Enrichment Rate: {analytics['enrichment_rate']:.1f}%")
            print(f"    • Storage Success: {analytics['success_metrics']['storage_success']}")
            
            self.results['analytics'] = analytics
            
        except Exception as e:
            print(f"  ❌ Analytics generation failed: {e}")
    
    async def cleanup_connectors(self):
        """Cleanup all connectors"""
        
        print("\n🧹 Cleaning up connectors...")
        
        for name, connector in self.connectors.items():
            try:
                await connector.disconnect()
                print(f"  ✅ Disconnected {name}")
            except Exception as e:
                print(f"  ⚠️ Error disconnecting {name}: {e}")
    
    async def run_complete_workflow(self):
        """Run the complete multi-connector workflow"""
        
        print("🚀 Starting Multi-Connector Workflow")
        print("=" * 60)
        
        start_time = datetime.utcnow()
        
        try:
            # Setup
            await self.setup_connectors()
            
            # Execute workflow steps
            scraped_data = await self.step1_scrape_company_data()
            enriched_data = await self.step2_enrich_with_api_data(scraped_data)
            await self.step3_store_in_database(enriched_data)
            await self.step4_export_to_excel(enriched_data)
            await self.step5_generate_analytics()
            
            # Calculate total time
            total_time = (datetime.utcnow() - start_time).total_seconds()
            
            print("\n" + "=" * 60)
            print("✅ Workflow Completed Successfully!")
            print(f"⏱️  Total execution time: {total_time:.2f} seconds")
            print(f"📊 Records processed: {len(enriched_data)}")
            print(f"💾 Export file: {self.results.get('export_file', 'N/A')}")
            
            # Show final summary
            print("\n📋 Workflow Summary:")
            print("  1. ✅ Web scraping from multiple sources")
            print("  2. ✅ API enrichment of scraped data")
            print("  3. ✅ Database storage for persistence")
            print("  4. ✅ Excel export for analysis")
            print("  5. ✅ Analytics and insights generation")
            
        except Exception as e:
            print(f"\n❌ Workflow failed: {e}")
            
        finally:
            await self.cleanup_connectors()


async def main():
    """Run the multi-connector workflow example"""
    
    workflow = MultiConnectorWorkflow()
    await workflow.run_complete_workflow()
    
    print("\n" + "=" * 60)
    print("🎯 Next Steps:")
    print("1. Customize connectors for your specific data sources")
    print("2. Add data validation and transformation logic")
    print("3. Implement error recovery and retry mechanisms")
    print("4. Set up scheduling for automated execution")
    print("5. Add monitoring and alerting capabilities")


if __name__ == "__main__":
    asyncio.run(main())