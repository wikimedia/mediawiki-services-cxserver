# Print a Tab seperated file with all languages supported by MT providers
import requests

# Send a GET request to the API endpoint
response = requests.get('https://cxserver.wikimedia.org/v1/list/mt')

# get the JSON data returned by the API
data = response.json()
all_langs = []
coverage = {}
# loop through the key-value pairs of the data
for provider, value in data.items():
    if provider == "defaults":
        continue
    # loop through the sub key-value pairs of the current key-value pair
    for source_lang, target_langs in value.items():
        if source_lang not in coverage:
            coverage[source_lang] = {}
        all_langs.append(source_lang)
        for target_lang in target_langs:
            all_langs.append(target_lang)
            if target_lang not in coverage[source_lang]:
                coverage[source_lang][target_lang] = []
            coverage[source_lang][target_lang].append(provider)

all_langs = sorted(set(all_langs))

print("\t", end="")
for lang in all_langs:
    print(f"{lang}", end="\t")
print("")

for source_lang in all_langs:
    print(f"{source_lang}", end="\t")
    for target_lang in all_langs:
        providers = []
        if source_lang in coverage and target_lang in coverage[source_lang]:
            providers = coverage[source_lang][target_lang]
        print(f"{','.join(providers)}", end="\t")
    print("")
